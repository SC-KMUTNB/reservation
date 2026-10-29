<script lang="ts">
  import { onMount } from 'svelte';
  import ViewSwitcherFooter from '$lib/components/mobile/ViewSwitcherFooter.svelte';
  import { getNowInTimezone } from '$lib/date-utils';
  import {
    type BookingItem,
    type BookingFormData,
    REQUESTER_PROFILE_STORAGE_KEY,
  } from '$lib/types/booking';
  import {
    type FacilityConfig,
    DEFAULT_FACILITY_CONFIG,
    generateTimeSlots,
  } from '$lib/facility-config';
  import { validateBookingInput } from '$lib/booking-validation';

  import BookingPageHeader from '$lib/components/booking/BookingPageHeader.svelte';
  import BookingCalendarCard from '$lib/components/booking/BookingCalendarCard.svelte';
  import BookingFormModal from '$lib/components/booking/BookingFormModal.svelte';
  import BookingRulesModal from '$lib/components/booking/BookingRulesModal.svelte';
  import BookingSuccessModal from '$lib/components/booking/BookingSuccessModal.svelte';

  interface Props {
    currentMode?: 'desktop' | 'mobile';
  }

  let { currentMode = 'desktop' }: Props = $props();

  let currentDate = $state(new Date());
  let bookingsByMonth = $state<Record<string, BookingItem[]>>({});
  let settings = $state<Record<string, string>>({});
  let facilityConfig = $state<FacilityConfig>(DEFAULT_FACILITY_CONFIG);
  let isLoading = $state(false);

  let selectedDate = $state<string>('');
  let isBookingModalOpen = $state(false);
  let isRuleModalOpen = $state(false);
  let successBookingCode = $state<string | null>(null);
  let submittedDetails = $state<BookingFormData | null>(null);
  let errorMessage = $state<string | null>(null);
  let validationErrors = $state<Record<string, string | undefined>>({});

  let formData = $state<BookingFormData>({
    date: '',
    startTime: '08:00',
    endTime: '10:00',
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    department: '',
    reason: '',
    borrowedEquipment: [],
  });

  let todayInfo = $derived(getNowInTimezone(settings.timezone || 'Asia/Bangkok'));
  let todayStr = $derived(todayInfo.dateStr);
  let nowTimeStr = $derived(todayInfo.timeStr);

  onMount(() => {
    try {
      localStorage.removeItem(REQUESTER_PROFILE_STORAGE_KEY);
    } catch {}

    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) settings = data.settings;
        if (data?.facilityConfig) facilityConfig = data.facilityConfig;
      })
      .catch(() => {});
  });

  let currentMonthKey = $derived(
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  );

  async function fetchBookingsForMonth(monthKey: string) {
    try {
      const res = await fetch(`/api/bookings?month=${monthKey}`);
      if (res.ok) {
        const data = await res.json();
        bookingsByMonth = { ...bookingsByMonth, [monthKey]: data.bookings || [] };
      }
    } catch {}
  }

  $effect(() => {
    fetchBookingsForMonth(currentMonthKey);
  });

  let activeMonthBookings = $derived(bookingsByMonth[currentMonthKey] || []);
  let bookingsOnSelectedDate = $derived(
    activeMonthBookings.filter((b) => b.date === selectedDate)
  );

  let timeSlots = $derived(
    generateTimeSlots(facilityConfig.openTime, facilityConfig.closeTime, facilityConfig.slotIntervalMinutes)
  );

  function handleSelectDate(dateStr: string) {
    selectedDate = dateStr;
    const bookingsForDate = (bookingsByMonth[dateStr.slice(0, 7)] || activeMonthBookings).filter(
      (b) => b.date === dateStr
    );
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;

    const firstAvailable = timeSlots.find((slot) => {
      const isPastToday = isToday && slot.start <= nowTimeStr;
      if (isPast || isPastToday) return false;
      const conflict = bookingsForDate.some(
        (b) =>
          (b.status === 'APPROVED' || b.status === 'PENDING') &&
          slot.start < b.endTime &&
          slot.end > b.startTime
      );
      return !conflict;
    });

    formData = {
      ...formData,
      date: dateStr,
      startTime: firstAvailable?.start || '',
      endTime: firstAvailable?.end || '',
    };
    validationErrors = {};
    errorMessage = null;
    isBookingModalOpen = true;
  }

  function handleFormFieldChange(field: keyof BookingFormData, value: string) {
    formData = { ...formData, [field]: value };
    if (validationErrors[field]) {
      validationErrors = { ...validationErrors, [field]: undefined };
    }
  }

  function handleToggleEquipment(id: string) {
    const cur = formData.borrowedEquipment || [];
    formData = {
      ...formData,
      borrowedEquipment: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    };
  }

  function handlePreSubmit(e: SubmitEvent) {
    e.preventDefault();
    const result = validateBookingInput({ ...formData, date: selectedDate }, { timezone: settings.timezone });
    if (!result.isValid) {
      validationErrors = result.errors;
      errorMessage = result.firstError || 'กรุณากรอกข้อมูลให้ถูกต้องครบถ้วน';
      return;
    }
    validationErrors = {};
    errorMessage = null;
    isBookingModalOpen = false;
    isRuleModalOpen = true;
  }

  async function handleFinalConfirm() {
    isLoading = true;
    errorMessage = null;
    try {
      const payload = { ...formData, date: selectedDate };
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        isRuleModalOpen = false;
        isBookingModalOpen = true;
        errorMessage = data.error || 'ไม่สามารถส่งคำขอจองได้';
        return;
      }
      isRuleModalOpen = false;
      submittedDetails = payload;
      successBookingCode = data.booking.bookingCode;
      fetchBookingsForMonth(selectedDate.slice(0, 7) || currentMonthKey);
    } catch {
      errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="min-h-dvh flex flex-col bg-slate-50 text-slate-800">
  <BookingPageHeader
    siteTitle={settings.site_title}
    siteSubtitle={settings.site_subtitle}
    {facilityConfig}
  />

  <main class="flex-grow max-w-6xl mx-auto px-4 -mt-4 pb-14 w-full relative z-20">
    <BookingCalendarCard
      {currentDate}
      onPrevMonth={() => (currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
      onNextMonth={() => (currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
      onTodayMonth={() => (currentDate = new Date())}
      onSelectDate={handleSelectDate}
      {selectedDate}
      bookings={activeMonthBookings}
      closedDates={facilityConfig.closedDates || []}
      {todayStr}
    />
  </main>

  <BookingFormModal
    isOpen={isBookingModalOpen}
    onClose={() => (isBookingModalOpen = false)}
    {selectedDate}
    {facilityConfig}
    {formData}
    {timeSlots}
    {bookingsOnSelectedDate}
    {todayStr}
    {nowTimeStr}
    {validationErrors}
    {isLoading}
    {errorMessage}
    onToggleEquipment={handleToggleEquipment}
    onSelectSlot={(start, end) => (formData = { ...formData, startTime: start, endTime: end })}
    onFormFieldChange={handleFormFieldChange}
    onSubmit={handlePreSubmit}
  />

  <BookingRulesModal
    isOpen={isRuleModalOpen}
    rules={facilityConfig.bookingRules || []}
    onClose={() => { isRuleModalOpen = false; isBookingModalOpen = true; }}
    onConfirm={handleFinalConfirm}
    {isLoading}
  />

  <BookingSuccessModal
    bookingCode={successBookingCode}
    bookingDetails={submittedDetails}
    onClose={() => { successBookingCode = null; submittedDetails = null; }}
  />

  <ViewSwitcherFooter {currentMode} />
</div>

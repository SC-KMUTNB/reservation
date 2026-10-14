'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ViewSwitcherFooter from '@/components/mobile/ViewSwitcherFooter';
import { getNowInTimezone } from '@/lib/date-utils';
import { BookingItem, BookingFormData, SavedRequesterProfile, REQUESTER_PROFILE_STORAGE_KEY } from '@/types/booking';
import { FacilityConfig, DEFAULT_FACILITY_CONFIG, generateTimeSlots } from '@/lib/facility-config';
import { validateBookingInput } from '@/lib/booking-validation';

import BookingPageHeader from '@/components/booking/BookingPageHeader';
import BookingCalendarCard from '@/components/booking/BookingCalendarCard';
import BookingFormModal from '@/components/booking/BookingFormModal';
import BookingRulesModal from '@/components/booking/BookingRulesModal';
import BookingSuccessModal from '@/components/booking/BookingSuccessModal';

export default function BookingPage({ currentMode = 'desktop' }: { currentMode?: 'desktop' | 'mobile' } = {}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [bookingsByMonth, setBookingsByMonth] = useState<Record<string, BookingItem[]>>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [facilityConfig, setFacilityConfig] = useState<FacilityConfig>(DEFAULT_FACILITY_CONFIG);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [successBookingCode, setSuccessBookingCode] = useState<string | null>(null);
  const [submittedDetails, setSubmittedDetails] = useState<BookingFormData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string | undefined>>({});

  const [rememberMe, setRememberMe] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);

  const [formData, setFormData] = useState<BookingFormData>({
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

  const { dateStr: todayStr, timeStr: nowTimeStr } = useMemo(
    () => getNowInTimezone(settings.timezone || 'Asia/Bangkok'),
    [settings.timezone]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REQUESTER_PROFILE_STORAGE_KEY);
      if (raw) {
        const saved: SavedRequesterProfile = JSON.parse(raw);
        setFormData((prev) => ({ ...prev, ...saved }));
        setRememberMe(true);
        setHasSavedProfile(true);
      }
    } catch {}
  }, []);

  const handleClearSavedProfile = () => {
    localStorage.removeItem(REQUESTER_PROFILE_STORAGE_KEY);
    setHasSavedProfile(false);
    setRememberMe(false);
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) setSettings(data.settings);
        if (data?.facilityConfig) setFacilityConfig(data.facilityConfig);
      })
      .catch(() => {});
  }, []);

  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const fetchBookingsForMonth = useCallback(async (monthKey: string) => {
    try {
      const res = await fetch(`/api/bookings?month=${monthKey}`);
      if (res.ok) {
        const data = await res.json();
        setBookingsByMonth((prev) => ({ ...prev, [monthKey]: data.bookings || [] }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchBookingsForMonth(currentMonthKey);
  }, [currentMonthKey, fetchBookingsForMonth]);

  const activeMonthBookings = bookingsByMonth[currentMonthKey] || [];
  const bookingsOnSelectedDate = useMemo(
    () => activeMonthBookings.filter((b) => b.date === selectedDate),
    [activeMonthBookings, selectedDate]
  );

  const timeSlots = useMemo(
    () => generateTimeSlots(facilityConfig.openTime, facilityConfig.closeTime, facilityConfig.slotIntervalMinutes),
    [facilityConfig]
  );

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setFormData((prev) => ({
      ...prev,
      date: dateStr,
      startTime: facilityConfig.openTime || '08:00',
      endTime: timeSlots[1]?.end || '10:00',
    }));
    setValidationErrors({});
    setErrorMessage(null);
    setIsBookingModalOpen(true);
  };

  const handleFormFieldChange = (field: keyof BookingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleToggleEquipment = (id: string) => {
    setFormData((prev) => {
      const cur = prev.borrowedEquipment || [];
      return { ...prev, borrowedEquipment: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateBookingInput({ ...formData, date: selectedDate }, { timezone: settings.timezone });
    if (!result.isValid) {
      setValidationErrors(result.errors);
      setErrorMessage(result.firstError || 'กรุณากรอกข้อมูลให้ถูกต้องครบถ้วน');
      return;
    }
    setValidationErrors({});
    setErrorMessage(null);
    setIsBookingModalOpen(false);
    setIsRuleModalOpen(true);
  };

  const handleFinalConfirm = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const payload = { ...formData, date: selectedDate };
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setIsRuleModalOpen(false);
        setIsBookingModalOpen(true);
        setErrorMessage(data.error || 'ไม่สามารถส่งคำขอจองได้');
        return;
      }
      if (rememberMe) {
        const { fullName, studentId, email, phone, department } = formData;
        localStorage.setItem(REQUESTER_PROFILE_STORAGE_KEY, JSON.stringify({ fullName, studentId, email, phone, department }));
        setHasSavedProfile(true);
      }
      setIsRuleModalOpen(false);
      setSubmittedDetails(payload);
      setSuccessBookingCode(data.booking.bookingCode);
      fetchBookingsForMonth(selectedDate.slice(0, 7) || currentMonthKey);
    } catch {
      setErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-800">
      <BookingPageHeader
        siteTitle={settings.site_title}
        siteSubtitle={settings.site_subtitle}
        facilityConfig={facilityConfig}
      />

      <main className="flex-grow max-w-6xl mx-auto px-4 -mt-4 pb-14 w-full relative z-20">
        <BookingCalendarCard
          currentDate={currentDate}
          onPrevMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          onTodayMonth={() => setCurrentDate(new Date())}
          onSelectDate={handleSelectDate}
          selectedDate={selectedDate}
          bookings={activeMonthBookings}
          closedDates={facilityConfig.closedDates || []}
          todayStr={todayStr}
        />
      </main>

      <BookingFormModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        selectedDate={selectedDate}
        facilityConfig={facilityConfig}
        formData={formData}
        timeSlots={timeSlots}
        bookingsOnSelectedDate={bookingsOnSelectedDate}
        todayStr={todayStr}
        nowTimeStr={nowTimeStr}
        validationErrors={validationErrors}
        rememberMe={rememberMe}
        hasSavedProfile={hasSavedProfile}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onToggleEquipment={handleToggleEquipment}
        onSelectSlot={(start, end) => setFormData((prev) => ({ ...prev, startTime: start, endTime: end }))}
        onFormFieldChange={handleFormFieldChange}
        onToggleRememberMe={setRememberMe}
        onClearSavedProfile={handleClearSavedProfile}
        onSubmit={handlePreSubmit}
      />

      <BookingRulesModal
        isOpen={isRuleModalOpen}
        rules={facilityConfig.bookingRules || []}
        onClose={() => { setIsRuleModalOpen(false); setIsBookingModalOpen(true); }}
        onConfirm={handleFinalConfirm}
        isLoading={isLoading}
      />

      <BookingSuccessModal
        bookingCode={successBookingCode}
        bookingDetails={submittedDetails}
        onClose={() => { setSuccessBookingCode(null); setSubmittedDetails(null); }}
      />

      <ViewSwitcherFooter currentMode={currentMode} />
    </div>
  );
}

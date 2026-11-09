<script lang="ts">
  import {
    X,
    Check,
    CheckCircle2,
    Copy,
    CalendarDays,
    Download,
    Search,
    Clock,
    User,
    Mail,
    Phone,
    Hash,
    Building,
    FileText,
    AlertTriangle,
    ShieldAlert,
    ArrowRight,
    ArrowLeft,
    Sparkles,
  } from 'lucide-svelte';
  import QRCode from 'qrcode';
  import type { BookingItem, BookingFormData } from '$lib/types/booking';
  import type { FacilityConfig } from '$lib/facility-config';
  import EquipmentSelector from '$lib/components/booking/EquipmentSelector.svelte';
  import TimeSlotPicker, { type TimeSlot } from '$lib/components/booking/TimeSlotPicker.svelte';
  import { formatDisplayDate } from '$lib/date-utils';
  import { validateBookingInput } from '$lib/booking-validation';
  import { buildGoogleCalendarUrl, generateIcsContent } from '$lib/calendar-export';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: string;
    facilityConfig: FacilityConfig;
    formData: BookingFormData;
    timeSlots: TimeSlot[];
    bookingsOnSelectedDate: BookingItem[];
    todayStr: string;
    nowTimeStr: string;
    isLoading: boolean;
    errorMessage?: string | null;
    appBaseUrl?: string;
    onToggleEquipment: (id: string) => void;
    onSelectSlot: (start: string, end: string) => void;
    onFormFieldChange: (field: keyof BookingFormData, value: string) => void;
    onFinalSubmit: () => Promise<{ success: boolean; bookingCode?: string; error?: string }>;
  }

  let {
    isOpen,
    onClose,
    selectedDate,
    facilityConfig,
    formData,
    timeSlots,
    bookingsOnSelectedDate,
    todayStr,
    nowTimeStr,
    isLoading,
    errorMessage,
    appBaseUrl,
    onToggleEquipment,
    onSelectSlot,
    onFormFieldChange,
    onFinalSubmit,
  }: Props = $props();

  let currentStep = $state<1 | 2 | 3 | 4>(1);
  let agreeToRules = $state(false);
  let confirmedBookingCode = $state<string | null>(null);
  let stepErrors = $state<Record<string, string | undefined>>({});
  let submitError = $state<string | null>(null);
  let copied = $state(false);
  let qrDataUrl = $state('');

  let previousOpen = $state(false);
  let previousDate = $state('');

  $effect(() => {
    if (isOpen && (!previousOpen || selectedDate !== previousDate)) {
      currentStep = 1;
      agreeToRules = false;
      confirmedBookingCode = null;
      stepErrors = {};
      submitError = null;
      copied = false;
      qrDataUrl = '';
    }
    previousOpen = isOpen;
    previousDate = selectedDate;
  });

  const STEPS = [
    { id: 1, title: 'เวลาและอุปกรณ์' },
    { id: 2, title: 'ข้อมูลผู้จอง' },
    { id: 3, title: 'ตรวจสอบและระเบียบ' },
    { id: 4, title: 'ผลการจอง' },
  ] as const;

  let originUrl = $derived(
    appBaseUrl || (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '')
  );

  let trackUrl = $derived(
    confirmedBookingCode ? `${originUrl}/track?q=${encodeURIComponent(confirmedBookingCode)}` : ''
  );

  $effect(() => {
    if (trackUrl && currentStep === 4) {
      QRCode.toDataURL(trackUrl, {
        width: 140,
        margin: 1,
        color: { dark: '#ea580c', light: '#ffffff' },
      })
        .then((url) => {
          qrDataUrl = url;
        })
        .catch((err) => {
          console.error('QR render error:', err);
        });
    }
  });

  let googleCalUrl = $derived.by(() => {
    if (!formData || !confirmedBookingCode) return '';
    return buildGoogleCalendarUrl({
      bookingCode: confirmedBookingCode,
      date: selectedDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      fullName: formData.fullName,
      department: formData.department,
      reason: formData.reason,
      status: 'PENDING',
      trackUrl,
    });
  });

  function handleDownloadIcs() {
    if (!formData || !confirmedBookingCode) return;
    const content = generateIcsContent({
      bookingCode: confirmedBookingCode,
      date: selectedDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      fullName: formData.fullName,
      department: formData.department,
      reason: formData.reason,
      status: 'PENDING',
      trackUrl,
    });

    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${confirmedBookingCode}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function copyBookingCode() {
    if (!confirmedBookingCode) return;
    navigator.clipboard.writeText(confirmedBookingCode);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function goToStep2() {
    stepErrors = {};
    if (!formData.startTime || !formData.endTime) {
      stepErrors.time = 'กรุณาเลือกช่วงเวลาเริ่มต้นและสิ้นสุด';
      return;
    }
    if (formData.startTime >= formData.endTime) {
      stepErrors.time = 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด';
      return;
    }
    if (selectedDate === todayStr && formData.startTime <= nowTimeStr) {
      stepErrors.time = 'เวลาเริ่มต้นที่เลือกได้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต';
      return;
    }
    const hasConflict = bookingsOnSelectedDate.some(
      (b) =>
        (b.status === 'APPROVED' || b.status === 'PENDING') &&
        formData.startTime < b.endTime &&
        formData.endTime > b.startTime
    );
    if (hasConflict) {
      stepErrors.time = 'ช่วงเวลาที่เลือกมีคิวการจองอื่นอยู่แล้ว กรุณาเลือกช่วงเวลาอื่น';
      return;
    }
    currentStep = 2;
  }

  function goToStep3() {
    const result = validateBookingInput(
      { ...formData, date: selectedDate },
      { timezone: 'Asia/Bangkok' }
    );
    const errs: Record<string, string | undefined> = {};
    if (result.errors.fullName) errs.fullName = result.errors.fullName;
    if (result.errors.studentId) errs.studentId = result.errors.studentId;
    if (result.errors.email) errs.email = result.errors.email;
    if (result.errors.phone) errs.phone = result.errors.phone;
    if (result.errors.department) errs.department = result.errors.department;
    if (result.errors.reason) errs.reason = result.errors.reason;

    if (Object.keys(errs).length > 0) {
      stepErrors = errs;
      return;
    }
    stepErrors = {};
    currentStep = 3;
  }

  async function handleConfirmBooking() {
    submitError = null;
    const res = await onFinalSubmit();
    if (res.success && res.bookingCode) {
      confirmedBookingCode = res.bookingCode;
      currentStep = 4;
    } else {
      submitError = res.error || 'เกิดข้อผิดพลาดในการส่งคำขอจอง';
    }
  }

  let selectedEquipmentNames = $derived.by(() => {
    const list = facilityConfig.equipmentList || [];
    const selectedIds = formData.borrowedEquipment || [];
    return list.filter((item) => selectedIds.includes(item.id)).map((item) => item.name);
  });
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
    <div class="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 my-auto text-slate-800 max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Top Step Header -->
      <div class="px-5 pt-5 pb-3 sm:px-7 sm:pt-6 border-b border-slate-100 shrink-0 bg-white">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full {currentStep === 4 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}">
                {#if currentStep === 4}
                  คำขอสมบูรณ์
                {:else}
                  ขั้นตอน {currentStep} จาก 3
                {/if}
              </span>
              <span class="text-xs font-semibold text-slate-500">
                วันที่ {formatDisplayDate(selectedDate)}
              </span>
            </div>
            <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {#if currentStep === 1}
                เลือกช่วงเวลาและอุปกรณ์
              {:else if currentStep === 2}
                กรอกข้อมูลผู้ขอใช้บริการ
              {:else if currentStep === 3}
                ตรวจสอบข้อมูลและยอมรับระเบียบ
              {:else}
                ส่งคำขอจองสำเร็จ
              {/if}
            </h3>
          </div>
          <button
            type="button"
            onclick={onClose}
            class="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer -mr-1"
            title="ปิดหน้าต่าง"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Step Indicator Bar -->
        <div class="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1">
          {#each STEPS as step}
            {@const isCompleted = step.id < currentStep}
            {@const isCurrent = step.id === currentStep}
            {@const isClickable = step.id < currentStep && currentStep !== 4}
            <button
              type="button"
              disabled={!isClickable}
              onclick={() => { if (isClickable) currentStep = step.id; }}
              class="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-xl border text-left transition-all duration-200 {isCurrent
                ? 'bg-orange-50/80 border-orange-300 text-orange-950 shadow-xs'
                : isCompleted
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70 cursor-pointer'
                : 'bg-slate-50/60 border-slate-200/60 text-slate-400 cursor-not-allowed'}"
            >
              <span
                class="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors {isCurrent
                  ? 'bg-orange-600 text-white'
                  : isCompleted
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-500'}"
              >
                {#if isCompleted}
                  <Check class="w-3 h-3 stroke-[2.5]" />
                {:else}
                  {step.id}
                {/if}
              </span>
              <span class="text-[11px] font-semibold truncate hidden sm:inline">
                {step.title}
              </span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Scrollable Step Body -->
      <div class="overflow-y-auto flex-1 p-5 sm:p-7 space-y-5">
        
        <!-- STEP 1: Time & Equipment -->
        {#if currentStep === 1}
          <div class="space-y-5">
            {#if stepErrors.time}
              <div class="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl flex items-start gap-2 text-xs">
                <AlertTriangle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span class="font-medium">{stepErrors.time}</span>
              </div>
            {/if}

            <!-- Room Info & Equipment -->
            <EquipmentSelector
              equipmentList={facilityConfig.equipmentList || []}
              selectedEquipment={formData.borrowedEquipment || []}
              {onToggleEquipment}
              roomName={facilityConfig.roomName}
              roomLocation={facilityConfig.roomLocation}
              maxCapacity={facilityConfig.maxCapacity}
            />

            <!-- Time Slot Picker -->
            <TimeSlotPicker
              slots={timeSlots}
              bookingsOnDate={bookingsOnSelectedDate}
              startTime={formData.startTime}
              endTime={formData.endTime}
              {onSelectSlot}
              isToday={selectedDate === todayStr}
              currentTimeStr={nowTimeStr}
              isPastDate={selectedDate < todayStr}
            />
          </div>

        <!-- STEP 2: Requester Details -->
        {:else if currentStep === 2}
          <div class="space-y-4 text-xs">
            <div class="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-slate-700">
              <div class="flex items-center gap-2">
                <Clock class="w-4 h-4 text-orange-600" />
                <span class="font-medium">
                  {formatDisplayDate(selectedDate)} เวลา {formData.startTime} - {formData.endTime} น.
                </span>
              </div>
              <button
                type="button"
                onclick={() => (currentStep = 1)}
                class="text-orange-600 hover:text-orange-700 font-semibold text-xs cursor-pointer hover:underline"
              >
                เปลี่ยนเวลา
              </button>
            </div>

            <!-- Full Name -->
            <div>
              <label for="modal-fullname" class="block font-semibold text-slate-700 mb-1">
                ชื่อ-นามสกุล ผู้จอง <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="modal-fullname"
                  type="text"
                  required
                  value={formData.fullName}
                  oninput={(e) => {
                    onFormFieldChange('fullName', (e.currentTarget as HTMLInputElement).value);
                    if (stepErrors.fullName) stepErrors.fullName = undefined;
                  }}
                  placeholder="เช่น นายสมชาย ใจดี"
                  class="w-full pl-9 pr-3 py-2.5 bg-white border {stepErrors.fullName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
              {#if stepErrors.fullName}
                <p class="text-[11px] text-rose-600 mt-1">{stepErrors.fullName}</p>
              {/if}
            </div>

            <!-- Student ID & Phone -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="modal-studentid" class="block font-semibold text-slate-700 mb-1">
                  รหัสนักศึกษา (13 หลัก) <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <Hash class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-studentid"
                    type="text"
                    required
                    maxlength={13}
                    value={formData.studentId}
                    oninput={(e) => {
                      onFormFieldChange('studentId', (e.currentTarget as HTMLInputElement).value);
                      if (stepErrors.studentId) stepErrors.studentId = undefined;
                    }}
                    placeholder="เช่น 6501012345678"
                    class="w-full pl-9 pr-3 py-2.5 bg-white border {stepErrors.studentId ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {#if stepErrors.studentId}
                  <p class="text-[11px] text-rose-600 mt-1">{stepErrors.studentId}</p>
                {/if}
              </div>

              <div>
                <label for="modal-phone" class="block font-semibold text-slate-700 mb-1">
                  เบอร์ติดต่อ <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <Phone class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-phone"
                    type="tel"
                    required
                    value={formData.phone}
                    oninput={(e) => {
                      onFormFieldChange('phone', (e.currentTarget as HTMLInputElement).value);
                      if (stepErrors.phone) stepErrors.phone = undefined;
                    }}
                    placeholder="เช่น 0812345678"
                    class="w-full pl-9 pr-3 py-2.5 bg-white border {stepErrors.phone ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {#if stepErrors.phone}
                  <p class="text-[11px] text-rose-600 mt-1">{stepErrors.phone}</p>
                {/if}
              </div>
            </div>

            <!-- Email & Department -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="modal-email" class="block font-semibold text-slate-700 mb-1">
                  อีเมลผู้จอง <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <Mail class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-email"
                    type="email"
                    required
                    value={formData.email}
                    oninput={(e) => {
                      onFormFieldChange('email', (e.currentTarget as HTMLInputElement).value);
                      if (stepErrors.email) stepErrors.email = undefined;
                    }}
                    placeholder="เช่น s6501012345678@kmutnb.ac.th"
                    class="w-full pl-9 pr-3 py-2.5 bg-white border {stepErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {#if stepErrors.email}
                  <p class="text-[11px] text-rose-600 mt-1">{stepErrors.email}</p>
                {/if}
              </div>

              <div>
                <label for="modal-dept" class="block font-semibold text-slate-700 mb-1">
                  หน่วยงาน / ชมรม / คณะ <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <Building class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-dept"
                    type="text"
                    required
                    value={formData.department}
                    oninput={(e) => {
                      onFormFieldChange('department', (e.currentTarget as HTMLInputElement).value);
                      if (stepErrors.department) stepErrors.department = undefined;
                    }}
                    placeholder="เช่น สโมสรนักศึกษาคณะวิศวกรรมศาสตร์"
                    class="w-full pl-9 pr-3 py-2.5 bg-white border {stepErrors.department ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {#if stepErrors.department}
                  <p class="text-[11px] text-rose-600 mt-1">{stepErrors.department}</p>
                {/if}
              </div>
            </div>

            <!-- Meeting Reason -->
            <div>
              <label for="modal-reason" class="block font-semibold text-slate-700 mb-1">
                เหตุผลและวาระการประชุม <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <FileText class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <textarea
                  id="modal-reason"
                  rows={2}
                  required
                  value={formData.reason}
                  oninput={(e) => {
                    onFormFieldChange('reason', (e.currentTarget as HTMLTextAreaElement).value);
                    if (stepErrors.reason) stepErrors.reason = undefined;
                  }}
                  placeholder="ระบุวาระการประชุมหรือกิจกรรมพอสังเขป (อย่างน้อย 5 ตัวอักษร)"
                  class="w-full pl-9 pr-3 py-2 bg-white border {stepErrors.reason ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'} rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                ></textarea>
              </div>
              {#if stepErrors.reason}
                <p class="text-[11px] text-rose-600 mt-1">{stepErrors.reason}</p>
              {/if}
            </div>
          </div>

        <!-- STEP 3: Summary & Rules Acceptance -->
        {:else if currentStep === 3}
          <div class="space-y-4 text-xs">
            {#if submitError || errorMessage}
              <div class="bg-rose-50 border border-rose-300 text-rose-700 p-3.5 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span class="font-medium">{submitError || errorMessage}</span>
              </div>
            {/if}

            <!-- Summary Card -->
            <div class="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <h4 class="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Sparkles class="w-4 h-4 text-orange-600" /> สรุปรายการจองห้องประชุม
                </h4>
                <button
                  type="button"
                  onclick={() => (currentStep = 2)}
                  class="text-orange-600 hover:text-orange-700 text-xs font-semibold cursor-pointer hover:underline"
                >
                  แก้ไขข้อมูล
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div class="space-y-1">
                  <div class="text-[11px] text-slate-400">วันและเวลาที่จอง</div>
                  <div class="font-semibold text-slate-900">
                    {formatDisplayDate(selectedDate)}
                  </div>
                  <div class="text-orange-600 font-bold">
                    {formData.startTime} - {formData.endTime} น.
                  </div>
                </div>

                <div class="space-y-1">
                  <div class="text-[11px] text-slate-400">สถานที่</div>
                  <div class="font-semibold text-slate-900">{facilityConfig.roomName}</div>
                  <div class="text-slate-500">{facilityConfig.roomLocation}</div>
                </div>

                <div class="space-y-1">
                  <div class="text-[11px] text-slate-400">ผู้ขอจอง / หน่วยงาน</div>
                  <div class="font-semibold text-slate-900">{formData.fullName} ({formData.studentId})</div>
                  <div class="text-slate-500">{formData.department}</div>
                </div>

                <div class="space-y-1">
                  <div class="text-[11px] text-slate-400">ช่องทางติดต่อ</div>
                  <div class="font-medium text-slate-900">{formData.phone}</div>
                  <div class="text-slate-500 truncate">{formData.email}</div>
                </div>
              </div>

              <!-- Borrowed Equipment -->
              <div class="pt-2 border-t border-slate-200/60">
                <div class="text-[11px] text-slate-400 mb-1.5">อุปกรณ์ที่ยืมเพิ่มเติม</div>
                {#if selectedEquipmentNames.length > 0}
                  <div class="flex flex-wrap gap-1.5">
                    {#each selectedEquipmentNames as eq}
                      <span class="bg-orange-100/70 text-orange-800 text-[11px] font-medium px-2.5 py-0.5 rounded-lg border border-orange-200">
                        {eq}
                      </span>
                    {/each}
                  </div>
                {:else}
                  <span class="text-slate-500 text-[11px] italic">ไม่มีการยืมอุปกรณ์เพิ่มเติม (ใช้อุปกรณ์มาตรฐานประจำห้อง)</span>
                {/if}
              </div>

              <!-- Reason -->
              <div class="pt-2 border-t border-slate-200/60">
                <div class="text-[11px] text-slate-400 mb-1">วัตถุประสงค์การใช้งาน</div>
                <p class="text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200/70 leading-relaxed">
                  {formData.reason}
                </p>
              </div>
            </div>

            <!-- Rules Card -->
            <div class="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
              <div class="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <ShieldAlert class="w-4 h-4 text-amber-600 shrink-0" />
                <span>ระเบียบและข้อตกลงการใช้บริการห้องประชุม</span>
              </div>
              <div class="text-xs text-amber-950/80 space-y-2 leading-relaxed">
                {#if facilityConfig.bookingRules && facilityConfig.bookingRules.length > 0}
                  {#each facilityConfig.bookingRules as rule, idx}
                    <div class="flex items-start gap-2">
                      <span class="font-bold text-amber-700 shrink-0">{idx + 1}.</span>
                      <span>{rule}</span>
                    </div>
                  {/each}
                {:else}
                  <div class="flex items-start gap-2">
                    <span class="font-bold text-amber-700 shrink-0">1.</span>
                    <span>ห้ามนำอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) เข้ามารับประทานในห้องประชุมเด็ดขาด</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="font-bold text-amber-700 shrink-0">2.</span>
                    <span>กรุณารักษาความสะอาด ปิดไฟ และเครื่องปรับอากาศทุกครั้งหลังใช้งานเสร็จสิ้น</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="font-bold text-amber-700 shrink-0">3.</span>
                    <span>ห้ามเคลื่อนย้ายอุปกรณ์ภายในห้องประชุมโดยไม่ได้รับอนุญาต</span>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Agreement Checkbox -->
            <label class="flex items-start gap-3 p-3.5 bg-orange-50/50 hover:bg-orange-50 border border-orange-200 rounded-2xl cursor-pointer transition select-none">
              <input
                type="checkbox"
                bind:checked={agreeToRules}
                class="mt-0.5 w-4 h-4 text-orange-600 rounded-md border-slate-300 focus:ring-orange-500 cursor-pointer"
              />
              <span class="text-xs text-orange-950 font-medium leading-relaxed">
                ฉันได้อ่านและยอมรับ <span class="font-bold text-orange-700">ระเบียบและข้อตกลงการใช้บริการห้องประชุม</span> ข้างต้นทุกประการ และยินยอมปฏิบัติตามอย่างเคร่งครัด
              </span>
            </label>
          </div>

        <!-- STEP 4: Success, QR Code & Calendar -->
        {:else if currentStep === 4 && confirmedBookingCode}
          <div class="space-y-5 text-center text-xs">
            <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-warm-xs">
              <CheckCircle2 class="w-8 h-8 stroke-[2.2]" />
            </div>
            
            <div>
              <h3 class="text-xl font-black text-slate-900 tracking-tight mb-1">
                ส่งคำขอจองสำเร็จ
              </h3>
              <p class="text-slate-500">
                คำขออยู่ในสถานะ <span class="text-amber-600 font-bold">รอการอนุมัติ (PENDING)</span> สามารถบันทึกรหัสหรือสแกน QR เพื่อติดตามผล
              </p>
            </div>

            <!-- Ticket / Booking Code Box -->
            <div class="bg-gradient-to-b from-orange-50 to-amber-50/60 border border-orange-200/90 rounded-2xl p-5 relative overflow-hidden">
              <div class="text-[11px] font-bold text-orange-950/70 tracking-wider uppercase mb-1">
                รหัสการจองของท่าน (Booking Code)
              </div>
              <div class="flex items-center justify-center gap-2">
                <span class="font-mono text-2xl font-black text-orange-600 tracking-tight">
                  {confirmedBookingCode}
                </span>
                <button
                  type="button"
                  onclick={copyBookingCode}
                  class="p-2 text-orange-600 hover:bg-orange-100/80 rounded-xl transition cursor-pointer active:scale-95"
                  title="คัดลอกรหัสการจอง"
                >
                  {#if copied}
                    <Check class="w-4 h-4 text-emerald-600" />
                  {:else}
                    <Copy class="w-4 h-4" />
                  {/if}
                </button>
              </div>
              {#if copied}
                <p class="text-[11px] text-emerald-700 font-semibold mt-1">คัดลอกรหัสเรียบร้อยแล้ว!</p>
              {/if}

              <!-- QR Code -->
              {#if qrDataUrl}
                <div class="mt-4 flex flex-col items-center">
                  <div class="p-2.5 bg-white rounded-2xl shadow-xs border border-orange-100">
                    <img src={qrDataUrl} alt="Booking QR Code" class="w-32 h-32" />
                  </div>
                  <span class="text-[10px] text-slate-400 mt-2">
                    สแกน QR Code นี้เพื่อเปิดดูสถานะคำขอบนอุปกรณ์อื่นได้ทันที
                  </span>
                </div>
              {/if}
            </div>

            <!-- Booking Summary Snippet -->
            <div class="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-left grid grid-cols-2 gap-2 text-slate-600">
              <div>
                <span class="text-[10px] text-slate-400 block">วันที่จอง</span>
                <span class="font-semibold text-slate-800">{formatDisplayDate(selectedDate)}</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block">เวลา</span>
                <span class="font-semibold text-orange-600">{formData.startTime} - {formData.endTime} น.</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block">ห้อง</span>
                <span class="font-medium text-slate-800 truncate block">{facilityConfig.roomName}</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block">ผู้ขอจอง</span>
                <span class="font-medium text-slate-800 truncate block">{formData.fullName}</span>
              </div>
            </div>

            <!-- Add to Calendar Buttons -->
            <div>
              <div class="text-[11px] font-semibold text-slate-500 mb-2">เพิ่มกิจกรรมลงปฏิทินส่วนตัว</div>
              <div class="grid grid-cols-2 gap-2.5">
                <a
                  href={googleCalUrl}
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex items-center justify-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 py-2.5 px-3 rounded-xl text-xs font-semibold transition active:scale-95"
                >
                  <CalendarDays class="w-3.5 h-3.5 text-orange-600" />
                  Google Calendar
                </a>
                <button
                  type="button"
                  onclick={handleDownloadIcs}
                  class="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95"
                >
                  <Download class="w-3.5 h-3.5 text-slate-600" />
                  ดาวน์โหลด .ics
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Buttons -->
      <div class="px-5 py-3.5 sm:px-7 sm:py-4 bg-slate-50/80 border-t border-slate-100 shrink-0 flex justify-between items-center gap-2">
        {#if currentStep === 1}
          <button
            type="button"
            onclick={onClose}
            class="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 font-medium text-xs transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onclick={goToStep2}
            class="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition shadow-warm-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>ถัดไป: ข้อมูลผู้จอง</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>

        {:else if currentStep === 2}
          <button
            type="button"
            onclick={() => (currentStep = 1)}
            class="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 font-medium text-xs transition cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            <span>ย้อนกลับ</span>
          </button>
          <button
            type="button"
            onclick={goToStep3}
            class="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition shadow-warm-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>ถัดไป: ตรวจสอบข้อมูล</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>

        {:else if currentStep === 3}
          <button
            type="button"
            disabled={isLoading}
            onclick={() => (currentStep = 2)}
            class="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 font-medium text-xs transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            <span>ย้อนกลับ</span>
          </button>
          <button
            type="button"
            disabled={!agreeToRules || isLoading}
            onclick={handleConfirmBooking}
            class="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition shadow-warm-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {#if isLoading}
              <span class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>กำลังส่งคำขอ...</span>
            {:else}
              <Check class="w-4 h-4 stroke-[2.5]" />
              <span>ยืนยันการจองห้องประชุม</span>
            {/if}
          </button>

        {:else if currentStep === 4}
          <a
            href="/track?q={encodeURIComponent(confirmedBookingCode || '')}"
            class="text-orange-600 hover:text-orange-700 font-semibold text-xs inline-flex items-center gap-1 hover:underline"
          >
            <Search class="w-3.5 h-3.5" /> ดูในหน้าระบบติดตาม
          </a>
          <button
            type="button"
            onclick={onClose}
            class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition cursor-pointer"
          >
            เสร็จสิ้น / ปิดหน้าต่าง
          </button>
        {/if}
      </div>

    </div>
  </div>
{/if}

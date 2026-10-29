<script lang="ts">
  import { X } from 'lucide-svelte';
  import type { BookingItem, BookingFormData } from '$lib/types/booking';
  import type { FacilityConfig } from '$lib/facility-config';
  import EquipmentSelector from '$lib/components/booking/EquipmentSelector.svelte';
  import TimeSlotPicker, { type TimeSlot } from '$lib/components/booking/TimeSlotPicker.svelte';
  import RequesterDetailsForm from '$lib/components/booking/RequesterDetailsForm.svelte';

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
    validationErrors: Record<string, string | undefined>;
    isLoading: boolean;
    errorMessage: string | null;
    onToggleEquipment: (id: string) => void;
    onSelectSlot: (start: string, end: string) => void;
    onFormFieldChange: (field: keyof BookingFormData, value: string) => void;
    onSubmit: (e: SubmitEvent) => void;
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
    validationErrors,
    isLoading,
    errorMessage,
    onToggleEquipment,
    onSelectSlot,
    onFormFieldChange,
    onSubmit,
  }: Props = $props();
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
    <div class="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 my-auto text-slate-800 max-h-[calc(100dvh-1.5rem)] flex flex-col">
      <div class="flex justify-between items-start pb-3 border-b border-slate-100 shrink-0">
        <div>
          <h3 class="text-lg font-bold text-slate-900">ส่งคำขอจองห้องประชุมวันที่ {selectedDate}</h3>
          <p class="text-xs text-slate-500 mt-0.5">กรุณาเลือกช่วงเวลา และระบุข้อมูลผู้ขอใช้บริการให้ครบถ้วน</p>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="overflow-y-auto flex-1 pr-1 -mr-1 space-y-5 pt-4">
        <EquipmentSelector
          equipmentList={facilityConfig.equipmentList || []}
          selectedEquipment={formData.borrowedEquipment || []}
          {onToggleEquipment}
          roomName={facilityConfig.roomName}
          roomLocation={facilityConfig.roomLocation}
          maxCapacity={facilityConfig.maxCapacity}
        />

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

        <RequesterDetailsForm
          {formData}
          onChange={onFormFieldChange}
          errors={validationErrors}
          {onSubmit}
          onCancel={onClose}
          isSubmitting={isLoading}
          conflictMessage={errorMessage}
        />
      </div>
    </div>
  </div>
{/if}

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { BookingItem, BookingFormData } from '@/types/booking';
import { FacilityConfig } from '@/lib/facility-config';
import EquipmentSelector from '@/components/booking/EquipmentSelector';
import TimeSlotPicker from '@/components/booking/TimeSlotPicker';
import RequesterDetailsForm from '@/components/booking/RequesterDetailsForm';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  facilityConfig: FacilityConfig;
  formData: BookingFormData;
  timeSlots: Array<{ start: string; end: string; label: string }>;
  bookingsOnSelectedDate: BookingItem[];
  todayStr: string;
  nowTimeStr: string;
  validationErrors: Record<string, string | undefined>;
  rememberMe: boolean;
  hasSavedProfile: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  onToggleEquipment: (id: string) => void;
  onSelectSlot: (start: string, end: string) => void;
  onFormFieldChange: (field: keyof BookingFormData, value: string) => void;
  onToggleRememberMe: (val: boolean) => void;
  onClearSavedProfile: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function BookingFormModal({
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
  rememberMe,
  hasSavedProfile,
  isLoading,
  errorMessage,
  onToggleEquipment,
  onSelectSlot,
  onFormFieldChange,
  onToggleRememberMe,
  onClearSavedProfile,
  onSubmit,
}: BookingFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 my-auto text-slate-800 max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div className="flex justify-between items-start pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">ส่งคำขอจองห้องประชุมวันที่ {selectedDate}</h3>
            <p className="text-xs text-slate-500 mt-0.5">กรุณาเลือกช่วงเวลา และระบุข้อมูลผู้ขอใช้บริการให้ครบถ้วน</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 -mr-1 space-y-5 pt-4">
          <EquipmentSelector
            equipmentList={facilityConfig.equipmentList || []}
            selectedEquipment={formData.borrowedEquipment || []}
            onToggleEquipment={onToggleEquipment}
            roomName={facilityConfig.roomName}
            roomLocation={facilityConfig.roomLocation}
            maxCapacity={facilityConfig.maxCapacity}
          />

          <TimeSlotPicker
            slots={timeSlots}
            bookingsOnDate={bookingsOnSelectedDate}
            startTime={formData.startTime}
            endTime={formData.endTime}
            onSelectSlot={onSelectSlot}
            isToday={selectedDate === todayStr}
            currentTimeStr={nowTimeStr}
            isPastDate={selectedDate < todayStr}
          />

          <RequesterDetailsForm
            formData={formData}
            onChange={onFormFieldChange}
            errors={validationErrors}
            rememberMe={rememberMe}
            onToggleRememberMe={onToggleRememberMe}
            onClearSavedProfile={onClearSavedProfile}
            hasSavedProfile={hasSavedProfile}
            onSubmit={onSubmit}
            onCancel={onClose}
            isSubmitting={isLoading}
            conflictMessage={errorMessage}
          />
        </div>
      </div>
    </div>
  );
}

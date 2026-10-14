import { FacilityConfig } from '@/lib/facility-config';

export interface BookingItem {
  id: string;
  bookingCode: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  department: string;
  fullName: string;
}

export interface BookingFormData {
  date: string;
  startTime: string;
  endTime: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  department: string;
  reason: string;
  borrowedEquipment?: string[];
}

export interface SavedRequesterProfile {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  department: string;
}

export const REQUESTER_PROFILE_STORAGE_KEY = 'sc_kmutnb_requester_profile_v1';

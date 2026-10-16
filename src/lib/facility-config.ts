import { prisma } from './prisma';

export interface EquipmentItem {
  id: string;
  name: string;
  available: boolean;
}

export interface ClosedDateItem {
  date: string; // YYYY-MM-DD
  reason: string;
}

export interface FacilityConfig {
  roomName: string;
  roomLocation: string;
  maxCapacity: number;
  openTime: string;
  closeTime: string;
  slotIntervalMinutes: number;
  maxAdvanceBookingDays: number;
  equipmentList: EquipmentItem[];
  closedDates: ClosedDateItem[];
  bookingRules: string[];
}

export const DEFAULT_FACILITY_CONFIG: FacilityConfig = {
  roomName: 'ห้องประชุมสภานักศึกษา',
  roomLocation: 'ชั้น 3 อาคาร 40 ปี มจพ.',
  maxCapacity: 30,
  openTime: '08:00',
  closeTime: '20:00',
  slotIntervalMinutes: 60,
  maxAdvanceBookingDays: 90,
  equipmentList: [
    { id: 'projector', name: 'โปรเจกเตอร์ / จอภาพ HDMI', available: true },
    { id: 'microphone', name: 'ชุดไมโครโฟนไร้สาย 2 ตัว', available: true },
    { id: 'whiteboard', name: 'ไวท์บอร์ดและปากกาเขียนบอร์ด', available: true },
    { id: 'sound-system', name: 'เครื่องเสียงและลำโพง', available: true },
    { id: 'wifi', name: 'อินเทอร์เน็ต WiFi ความเร็วสูง', available: true },
  ],
  closedDates: [],
  bookingRules: [
    'ห้ามนำอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) เข้ามารับประทานในห้องประชุมเด็ดขาด',
    'ช่วยกันรักษาความสะอาด ปิดไฟ และเครื่องปรับอากาศทุกครั้งหลังใช้งานเสร็จ',
    'หากทำผิดกฎระเบียบ ท่านจะไม่สามารถจองห้องประชุมได้อีกเป็นเวลา 2 เดือนเต็ม',
  ],
};

const SETTING_KEY = 'facility_config_json';

export async function getFacilityConfig(): Promise<FacilityConfig> {
  try {
    const record = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (!record || !record.value) {
      return { ...DEFAULT_FACILITY_CONFIG };
    }

    const parsed = JSON.parse(record.value);
    return {
      roomName: parsed.roomName || DEFAULT_FACILITY_CONFIG.roomName,
      roomLocation: parsed.roomLocation || DEFAULT_FACILITY_CONFIG.roomLocation,
      maxCapacity: Number(parsed.maxCapacity) || DEFAULT_FACILITY_CONFIG.maxCapacity,
      openTime: parsed.openTime || DEFAULT_FACILITY_CONFIG.openTime,
      closeTime: parsed.closeTime || DEFAULT_FACILITY_CONFIG.closeTime,
      slotIntervalMinutes:
        Number(parsed.slotIntervalMinutes) || DEFAULT_FACILITY_CONFIG.slotIntervalMinutes,
      maxAdvanceBookingDays:
        Number(parsed.maxAdvanceBookingDays) || DEFAULT_FACILITY_CONFIG.maxAdvanceBookingDays,
      equipmentList: Array.isArray(parsed.equipmentList)
        ? parsed.equipmentList
        : DEFAULT_FACILITY_CONFIG.equipmentList,
      closedDates: Array.isArray(parsed.closedDates)
        ? parsed.closedDates
        : DEFAULT_FACILITY_CONFIG.closedDates,
      bookingRules: Array.isArray(parsed.bookingRules)
        ? parsed.bookingRules
        : DEFAULT_FACILITY_CONFIG.bookingRules,
    };
  } catch (error) {
    console.error('Failed to parse facility config from database:', error);
    return { ...DEFAULT_FACILITY_CONFIG };
  }
}

export async function saveFacilityConfig(config: Partial<FacilityConfig>): Promise<FacilityConfig> {
  const current = await getFacilityConfig();
  const merged: FacilityConfig = {
    ...current,
    ...config,
  };

  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(merged) },
    create: {
      key: SETTING_KEY,
      value: JSON.stringify(merged),
      description: 'Dynamic Facility and Room Configuration',
    },
  });

  return merged;
}

export function generateTimeSlots(
  openTime: string = '08:00',
  closeTime: string = '20:00',
  intervalMinutes: number = 60
): Array<{ start: string; end: string; label: string }> {
  const [openH, openM] = (openTime || '08:00').split(':').map(Number);
  const [closeH, closeM] = (closeTime || '20:00').split(':').map(Number);

  const startMinutes = openH * 60 + (openM || 0);
  const endMinutes = closeH * 60 + (closeM || 0);
  const step = Math.max(15, intervalMinutes || 60);

  const slots: Array<{ start: string; end: string; label: string }> = [];

  for (let m = startMinutes; m + step <= endMinutes; m += step) {
    const sH = String(Math.floor(m / 60)).padStart(2, '0');
    const sM = String(m % 60).padStart(2, '0');
    const eH = String(Math.floor((m + step) / 60)).padStart(2, '0');
    const eM = String((m + step) % 60).padStart(2, '0');

    const start = `${sH}:${sM}`;
    const end = `${eH}:${eM}`;
    slots.push({
      start,
      end,
      label: `${start} - ${end}`,
    });
  }

  return slots;
}

import { describe, expect, test } from 'bun:test';
import { DEFAULT_FACILITY_CONFIG, generateTimeSlots, EquipmentItem } from '@/lib/facility-config';

describe('Facility Configuration & Equipment', () => {
  test('DEFAULT_FACILITY_CONFIG has default equipment list with active items', () => {
    expect(DEFAULT_FACILITY_CONFIG.equipmentList.length).toBeGreaterThan(0);
    const hasProjector = DEFAULT_FACILITY_CONFIG.equipmentList.some((e) => e.id === 'projector');
    expect(hasProjector).toBe(true);
  });

  test('toggling equipment available status preserves state structure', () => {
    const list: EquipmentItem[] = [...DEFAULT_FACILITY_CONFIG.equipmentList];
    const toggled = list.map((item) =>
      item.id === 'projector' ? { ...item, available: !item.available } : item
    );

    const projector = toggled.find((e) => e.id === 'projector');
    expect(projector?.available).toBe(false);
    expect(toggled.length).toBe(list.length);
  });

  test('deleting equipment item removes it from list', () => {
    const list: EquipmentItem[] = [...DEFAULT_FACILITY_CONFIG.equipmentList];
    const filtered = list.filter((item) => item.id !== 'projector');

    expect(filtered.length).toBe(list.length - 1);
    expect(filtered.some((e) => e.id === 'projector')).toBe(false);
  });

  test('generateTimeSlots produces correct interval slots', () => {
    const slots = generateTimeSlots('08:00', '11:00', 60);
    expect(slots.length).toBe(3);
    expect(slots[0]).toEqual({ start: '08:00', end: '09:00', label: '08:00 - 09:00' });
    expect(slots[2]).toEqual({ start: '10:00', end: '11:00', label: '10:00 - 11:00' });
  });
});

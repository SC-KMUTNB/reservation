import { describe, expect, test } from 'bun:test';
import updatesData from '@/data/updates.json';

describe('updates.json validation', () => {
  test('updates.json is valid and contains v1.6.0 as latest', () => {
    expect(Array.isArray(updatesData)).toBe(true);
    expect(updatesData.length).toBeGreaterThan(0);

    const latest = updatesData[0];
    expect(latest.version).toBe('v1.6.0');
    expect(latest.date).toBe('2026-10-05');
    expect(latest.title).toContain('ป้องกันการจองย้อนหลัง');
    expect(latest.changes.length).toBeGreaterThan(0);
  });
});

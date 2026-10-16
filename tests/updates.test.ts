import { describe, expect, test } from 'bun:test';
import updatesData from '@/data/updates.json';

describe('updates.json validation', () => {
  test('updates.json is valid and contains latest updates', () => {
    expect(Array.isArray(updatesData)).toBe(true);
    expect(updatesData.length).toBeGreaterThan(0);

    const latest = updatesData[0];
    expect(latest.version).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(latest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(latest.title.length).toBeGreaterThan(0);
    expect(latest.changes.length).toBeGreaterThan(0);
  });
});

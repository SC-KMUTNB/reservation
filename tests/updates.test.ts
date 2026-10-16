import { describe, expect, test } from 'bun:test';
import {
  classifyVersion,
  normalizeCategory,
  parseGitHubRelease,
  formatUpdateToMarkdown,
  GitHubRelease,
  UpdateRecord,
} from '@/lib/changelog';
import { GET as getChangelog } from '@/app/api/changelog/route';
import { NextRequest } from 'next/server';

describe('SemVer Classification (classifyVersion)', () => {
  test('classifies major versions correctly', () => {
    expect(classifyVersion('v1.0.0')).toBe('major');
    expect(classifyVersion('v2.0.0')).toBe('major');
    expect(classifyVersion('1.0.0')).toBe('major');
  });

  test('classifies minor versions correctly', () => {
    expect(classifyVersion('v1.1.0')).toBe('minor');
    expect(classifyVersion('v1.7.0')).toBe('minor');
    expect(classifyVersion('v1.8.0')).toBe('minor');
    expect(classifyVersion('v1.9.0')).toBe('minor');
  });

  test('classifies patch versions correctly', () => {
    expect(classifyVersion('v1.0.1')).toBe('patch');
    expect(classifyVersion('v1.6.1')).toBe('patch');
    expect(classifyVersion('v2.1.3')).toBe('patch');
  });
});

describe('Category Normalization (normalizeCategory)', () => {
  test('normalizes various feature formats', () => {
    expect(normalizeCategory('feat')).toBe('feat');
    expect(normalizeCategory('Features')).toBe('feat');
    expect(normalizeCategory('ฟีเจอร์ใหม่')).toBe('feat');
    expect(normalizeCategory('[feat]')).toBe('feat');
  });

  test('normalizes bugfix formats', () => {
    expect(normalizeCategory('fix')).toBe('fix');
    expect(normalizeCategory('Bug Fixes')).toBe('fix');
    expect(normalizeCategory('แก้ไขข้อผิดพลาด')).toBe('fix');
    expect(normalizeCategory('[fix]')).toBe('fix');
  });

  test('normalizes security and improvements', () => {
    expect(normalizeCategory('security')).toBe('security');
    expect(normalizeCategory('ความปลอดภัย')).toBe('security');
    expect(normalizeCategory('improve')).toBe('improve');
    expect(normalizeCategory('ปรับปรุงระบบ')).toBe('improve');
  });
});

describe('parseGitHubRelease and formatUpdateToMarkdown', () => {
  test('parses markdown release body into structured UpdateRecord', () => {
    const mockRelease: GitHubRelease = {
      tag_name: 'v1.9.0',
      name: 'v1.9.0: Dynamic GitHub Changelog Suite',
      published_at: '2026-10-17T12:00:00Z',
      html_url: 'https://github.com/SC-KMUTNB/reservation/releases/tag/v1.9.0',
      body: `This is the overview summary of the release.

### ✨ ฟีเจอร์ใหม่ (Features)
- ระบบดึงและแคชประวัติการอัปเดตจาก GitHub Releases
- ระบบจำแนกและกรองเวอร์ชันตามมาตรฐาน SemVer 3 ระดับ

### 🐛 แก้ไขข้อผิดพลาด (Bug Fixes)
- แก้ไขปัญหาเวลาชนกันในการจอง
`,
    };

    const parsed = parseGitHubRelease(mockRelease);
    expect(parsed.version).toBe('v1.9.0');
    expect(parsed.type).toBe('minor');
    expect(parsed.summary).toContain('This is the overview summary');
    expect(parsed.changes.length).toBe(3);
    expect(parsed.changes[0].category).toBe('feat');
    expect(parsed.changes[0].description).toBe('ระบบดึงและแคชประวัติการอัปเดตจาก GitHub Releases');
    expect(parsed.changes[2].category).toBe('fix');
    expect(parsed.changes[2].description).toBe('แก้ไขปัญหาเวลาชนกันในการจอง');
    expect(parsed.htmlUrl).toBe('https://github.com/SC-KMUTNB/reservation/releases/tag/v1.9.0');
  });

  test('formats UpdateRecord into markdown and can be re-parsed', () => {
    const original: UpdateRecord = {
      version: 'v1.6.1',
      date: '2026-10-10',
      type: 'patch',
      title: 'Fix Base URL',
      summary: 'Super Admin can configure app Base URL.',
      changes: [
        { category: 'feat', description: 'Added app_base_url setting' },
        { category: 'fix', description: 'Fixed OAuth redirect' },
      ],
    };

    const markdown = formatUpdateToMarkdown(original);
    expect(markdown).toContain('Super Admin can configure app Base URL.');
    expect(markdown).toContain('### ✨ ฟีเจอร์ใหม่ (Features)');
    expect(markdown).toContain('- Added app_base_url setting');
    expect(markdown).toContain('### 🐛 แก้ไขข้อผิดพลาด (Bug Fixes)');
    expect(markdown).toContain('- Fixed OAuth redirect');

    const reparsed = parseGitHubRelease({
      tag_name: original.version,
      name: original.title,
      published_at: `${original.date}T00:00:00Z`,
      body: markdown,
    });

    expect(reparsed.version).toBe('v1.6.1');
    expect(reparsed.type).toBe('patch');
    expect(reparsed.changes.length).toBe(2);
  });
});

describe('GET /api/changelog route handler', () => {
  test('returns 200 and a list of updates from GitHub Releases API', async () => {
    const req = new NextRequest('http://localhost:3000/api/changelog');
    const response = await getChangelog(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.updates)).toBe(true);
    expect(body.updates.length).toBeGreaterThan(0);
    expect(body.source).toBe('github');

    // Verify SemVer classification on live releases
    const v190 = body.updates.find((u: any) => u.version === 'v1.9.0');
    if (v190) {
      expect(v190.type).toBe('minor');
    }
    const v161 = body.updates.find((u: any) => u.version === 'v1.6.1');
    if (v161) {
      expect(v161.type).toBe('patch');
    }
    const v100 = body.updates.find((u: any) => u.version === 'v1.0.0');
    if (v100) {
      expect(v100.type).toBe('major');
    }
  });
});

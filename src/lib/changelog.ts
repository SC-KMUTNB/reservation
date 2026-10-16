export type VersionType = 'major' | 'minor' | 'patch';
export type ChangeCategory = 'feat' | 'fix' | 'improve' | 'security' | string;

export interface ChangeItem {
  category: ChangeCategory;
  description: string;
}

export interface UpdateRecord {
  version: string;
  date: string;
  type: VersionType;
  title: string;
  summary: string;
  changes: ChangeItem[];
  htmlUrl?: string;
}

export interface GitHubRelease {
  id?: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  created_at?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
}

/**
 * Classifies a version string using strict Semantic Versioning:
 * - Major (vX.0.0): breaking changes or major system milestone
 * - Minor (v1.X.0): new feature additions
 * - Patch (v1.X.Y where Y > 0): bug fixes, maintenance, small tweaks
 */
export function classifyVersion(versionStr: string): VersionType {
  const match = versionStr.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return 'minor';
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = parseInt(match[3], 10);

  if (patch > 0) {
    return 'patch';
  }
  if (minor > 0) {
    return 'minor';
  }
  // When minor and patch are 0 (e.g. 1.0.0, 2.0.0)
  return 'major';
}

/**
 * Normalizes category name from headings or prefixes to standard categories
 */
export function normalizeCategory(raw: string): ChangeCategory {
  const cleaned = raw.toLowerCase().trim().replace(/^\[|\]$/g, '');
  if (cleaned.includes('feat') || cleaned.includes('ฟีเจอร์') || cleaned.includes('feature')) {
    return 'feat';
  }
  if (cleaned.includes('fix') || cleaned.includes('bug') || cleaned.includes('แก้') || cleaned.includes('ข้อผิดพลาด')) {
    return 'fix';
  }
  if (cleaned.includes('security') || cleaned.includes('ปลอดภัย') || cleaned.includes('sec')) {
    return 'security';
  }
  if (cleaned.includes('improve') || cleaned.includes('ปรับปรุง') || cleaned.includes('perf') || cleaned.includes('refactor')) {
    return 'improve';
  }
  return 'improve';
}

/**
 * Parses GitHub release body markdown into an UpdateRecord
 */
export function parseGitHubRelease(release: GitHubRelease): UpdateRecord {
  const version = release.tag_name || 'v1.0.0';
  const type = classifyVersion(version);
  const title = (release.name && release.name.trim()) || version;
  const date = (release.published_at || release.created_at || new Date().toISOString()).slice(0, 10);
  const rawBody = release.body || '';

  const lines = rawBody.split(/\r?\n/);
  const summaryLines: string[] = [];
  const changes: ChangeItem[] = [];

  let currentCategory: ChangeCategory = 'improve';
  let hasEncounteredSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for section headers (e.g. "### Features", "## Fixes", "### [feat]")
    const headerMatch = trimmed.match(/^#{1,4}\s+(.*)$/);
    if (headerMatch) {
      hasEncounteredSection = true;
      currentCategory = normalizeCategory(headerMatch[1]);
      continue;
    }

    // Check for bullet items
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      let desc = bulletMatch[1].trim();

      // Check if bullet has prefix like [feat], [fix], [security], etc.
      const prefixMatch = desc.match(/^\[([a-zA-Z0-9_\u0E00-\u0E7F]+)\]\s*(.*)$/);
      let itemCategory = currentCategory;
      if (prefixMatch) {
        itemCategory = normalizeCategory(prefixMatch[1]);
        desc = prefixMatch[2].trim();
      }

      if (desc) {
        changes.push({
          category: itemCategory,
          description: desc,
        });
      }
      continue;
    }

    // Lines before first header or bullet are part of the summary
    if (!hasEncounteredSection && changes.length === 0) {
      summaryLines.push(trimmed);
    }
  }

  const summary = summaryLines.join(' ').trim() || title;

  return {
    version,
    date,
    type,
    title,
    summary,
    changes,
    htmlUrl: release.html_url,
  };
}

/**
 * Formats an UpdateRecord into structured GitHub Release markdown
 */
export function formatUpdateToMarkdown(update: UpdateRecord): string {
  const sections: Record<string, string[]> = {
    feat: [],
    fix: [],
    improve: [],
    security: [],
  };

  const sectionTitles: Record<string, string> = {
    feat: '✨ ฟีเจอร์ใหม่ (Features)',
    fix: '🐛 แก้ไขข้อผิดพลาด (Bug Fixes)',
    improve: '⚡ ปรับปรุงระบบ (Improvements)',
    security: '🛡️ ความปลอดภัย (Security)',
  };

  for (const change of update.changes) {
    const cat = normalizeCategory(change.category);
    if (!sections[cat]) {
      sections[cat] = [];
    }
    sections[cat].push(change.description);
  }

  const parts: string[] = [];

  if (update.summary && update.summary !== update.title) {
    parts.push(update.summary);
    parts.push('');
  }

  for (const [catKey, title] of Object.entries(sectionTitles)) {
    const items = sections[catKey];
    if (items && items.length > 0) {
      parts.push(`### ${title}`);
      for (const item of items) {
        parts.push(`- ${item}`);
      }
      parts.push('');
    }
  }

  return parts.join('\n').trim();
}

import { NextRequest, NextResponse } from 'next/server';
import {
  UpdateRecord,
  GitHubRelease,
  parseGitHubRelease,
  classifyVersion,
} from '@/lib/changelog';
import fallbackUpdates from '@/data/updates.json';

const DEFAULT_REPO = 'SC-KMUTNB/reservation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const repo = process.env.GITHUB_REPO || DEFAULT_REPO;
  const token = process.env.GITHUB_TOKEN;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'KMUTNB-Reservation-App',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const fetchOptions: RequestInit = {
      headers,
      ...(force
        ? { cache: 'no-store' }
        : { next: { revalidate: 3600, tags: ['changelog'] } }),
    };

    const res = await fetch(
      `https://api.github.com/repos/${repo}/releases?per_page=100`,
      fetchOptions
    );

    if (res.ok) {
      const releases: GitHubRelease[] = await res.json();
      if (Array.isArray(releases) && releases.length > 0) {
        const publishedReleases = releases.filter((r) => !r.draft);
        const updates: UpdateRecord[] = publishedReleases.map(parseGitHubRelease);

        return NextResponse.json(
          {
            success: true,
            source: 'github',
            repo,
            updates,
            cachedAt: new Date().toISOString(),
          },
          {
            headers: {
              'Cache-Control': force
                ? 'no-store, max-age=0'
                : 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
          }
        );
      }
    }
  } catch (error) {
    console.error('Failed to fetch changelog from GitHub Releases:', error);
  }

  // Fallback to local updates.json with normalized SemVer classification
  const normalizedFallback: UpdateRecord[] = (fallbackUpdates as any[]).map((item) => ({
    ...item,
    type: classifyVersion(item.version),
  }));

  return NextResponse.json({
    success: true,
    source: 'fallback',
    repo,
    updates: normalizedFallback,
    cachedAt: new Date().toISOString(),
  });
}

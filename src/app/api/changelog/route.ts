import { NextRequest, NextResponse } from 'next/server';
import {
  UpdateRecord,
  GitHubRelease,
  parseGitHubRelease,
} from '@/lib/changelog';

const DEFAULT_REPO = 'SC-KMUTNB/reservation';

// In-memory backup cache across cold reloads
let lastCachedUpdates: UpdateRecord[] = [];
let lastCachedAt: string | null = null;

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

        lastCachedUpdates = updates;
        lastCachedAt = new Date().toISOString();

        return NextResponse.json(
          {
            success: true,
            source: 'github',
            repo,
            updates,
            cachedAt: lastCachedAt,
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
    } else {
      console.warn(`GitHub API responded with status ${res.status}: ${res.statusText}`);
    }
  } catch (error) {
    console.error('Failed to fetch changelog from GitHub Releases:', error);
  }

  // Return last in-memory cached updates if available
  if (lastCachedUpdates.length > 0) {
    return NextResponse.json({
      success: true,
      source: 'github',
      repo,
      updates: lastCachedUpdates,
      cachedAt: lastCachedAt,
    });
  }

  return NextResponse.json(
    {
      success: false,
      source: 'github',
      repo,
      updates: [],
      error: 'Unable to load releases from GitHub.',
      cachedAt: new Date().toISOString(),
    },
    { status: 502 }
  );
}

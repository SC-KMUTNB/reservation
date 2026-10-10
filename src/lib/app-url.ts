import { prisma } from './prisma';

function normalizeUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return '';
  return trimmed.replace(/\/+$/, '');
}

export async function getAppBaseUrl(fallbackOrigin?: string): Promise<string> {
  let settingValue = '';

  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: 'app_base_url' },
      select: { value: true },
    });
    settingValue = setting?.value || '';
  } catch (error) {
    console.warn('Could not read app base URL setting, using fallback:', error);
  }

  return (
    normalizeUrl(settingValue) ||
    normalizeUrl(process.env.NEXTAUTH_URL) ||
    normalizeUrl(process.env.BASE_URL) ||
    normalizeUrl(fallbackOrigin) ||
    'http://localhost:3000'
  );
}

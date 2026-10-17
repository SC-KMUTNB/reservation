export function extractBookingCode(scannedText: string): string {
  const trimmed = scannedText.trim();
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const checkInParam = url.searchParams.get('checkIn');
      if (checkInParam) return checkInParam.trim();
      const qParam = url.searchParams.get('q');
      if (qParam) return qParam.trim();
    }
  } catch {
    // ignore
  }

  const bkMatch = trimmed.match(/BK-[A-Za-z0-9_-]+/i);
  if (bkMatch) {
    return bkMatch[0].toUpperCase();
  }
  return trimmed;
}

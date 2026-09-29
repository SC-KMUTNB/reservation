/**
 * Utility functions for date formatting and manipulation across the reservation system.
 */

/**
 * Converts a date string (YYYY-MM-DD) into DD-MM-YYYY in Thai Buddhist Era (พ.ศ.).
 * Example: "2026-10-02" -> "02-10-2569"
 */
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';

  // Handle standard YYYY-MM-DD
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const yearCE = parseInt(match[1], 10);
    const month = match[2];
    const day = match[3];
    const yearBE = yearCE + 543;
    return `${day}-${month}-${yearBE}`;
  }

  // Handle Date objects or ISO strings
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const yearBE = parsed.getFullYear() + 543;
    return `${day}-${month}-${yearBE}`;
  }

  return dateStr;
}

/**
 * Returns searchable representation of dates so users can search
 * by DD-MM-YYYY (พ.ศ.), YYYY-MM-DD (ค.ศ.), DD/MM/YYYY, etc.
 */
export function getSearchableDateVariants(dateStr: string | null | undefined): string[] {
  if (!dateStr) return [];
  const variants = [dateStr.toLowerCase()];
  const formatted = formatDisplayDate(dateStr);
  if (formatted !== dateStr) {
    variants.push(formatted.toLowerCase());
    variants.push(formatted.replace(/-/g, '/').toLowerCase());
  }
  return variants;
}

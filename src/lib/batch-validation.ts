export interface CandidateBooking {
  id: string;
  bookingCode: string;
  date: string;
  startTime: string;
  endTime: string;
  fullName: string;
}

export function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

export function validateBatchApproval(
  candidates: CandidateBooking[],
  existingApproved: CandidateBooking[]
): {
  approved: CandidateBooking[];
  conflicts: Array<{ id: string; bookingCode: string; reason: string }>;
} {
  const approved: CandidateBooking[] = [];
  const conflicts: Array<{ id: string; bookingCode: string; reason: string }> = [];

  for (const candidate of candidates) {
    // Check against existing approved bookings on the same date
    const conflictExisting = existingApproved.find(
      (b) =>
        b.id !== candidate.id &&
        b.date === candidate.date &&
        hasTimeOverlap(candidate.startTime, candidate.endTime, b.startTime, b.endTime)
    );

    if (conflictExisting) {
      conflicts.push({
        id: candidate.id,
        bookingCode: candidate.bookingCode,
        reason: `ช่วงเวลา (${candidate.startTime} - ${candidate.endTime} น.) ซ้อนทับกับรายการของ ${conflictExisting.fullName} (${conflictExisting.startTime} - ${conflictExisting.endTime} น.) ที่อนุมัติไปแล้ว`,
      });
      continue;
    }

    // Check against already approved candidates in this batch on the same date
    const conflictCandidate = approved.find(
      (b) =>
        b.id !== candidate.id &&
        b.date === candidate.date &&
        hasTimeOverlap(candidate.startTime, candidate.endTime, b.startTime, b.endTime)
    );

    if (conflictCandidate) {
      conflicts.push({
        id: candidate.id,
        bookingCode: candidate.bookingCode,
        reason: `ช่วงเวลา (${candidate.startTime} - ${candidate.endTime} น.) ซ้อนทับกับรายการของ ${conflictCandidate.fullName} (${conflictCandidate.startTime} - ${conflictCandidate.endTime} น.) ที่ถูกเลือกอนุมัติในรอบเดียวกัน`,
      });
      continue;
    }

    approved.push(candidate);
  }

  return { approved, conflicts };
}

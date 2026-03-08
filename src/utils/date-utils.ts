import { DateTime } from "luxon";

type Shift = { dayOfWeek: number; startHour: number; endHour: number };
type BlockedWindow = {
  start: DateTime;
  end: DateTime;
  reason?: string;
  sourceType?: "workCenterMaintenance" | "workOrderMaintenance";
  sourceId?: string;
};

export type WorkCenterLike = {
  shifts: Shift[];
  blocked: BlockedWindow[]; // precomputed: wc.maintenanceWindows + fixed maintenance WOs
};

export function dt(iso: string): DateTime {
  // All dates are UTC per spec
  const parsed = DateTime.fromISO(iso, { zone: "utc" });
  if (parsed.isValid) return parsed;

  // Handle extended-hour timestamps like 2026-03-10T24:30:00Z
  const match = iso.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?Z$/,
  );
  if (!match) return parsed;
  const [, datePart, hh, mm, ss = "0"] = match;
  const hour = Number(hh);
  if (Number.isNaN(hour) || hour < 24) return parsed;
  const base = DateTime.fromISO(datePart, { zone: "utc" });
  if (!base.isValid) return parsed;
  return base.plus({
    hours: hour,
    minutes: Number(mm),
    seconds: Number(ss),
  });
}

export function toISO(d: DateTime): string {
  return d.toUTC().toISO({ suppressMilliseconds: true })!;
}

function getShiftForInstant(wc: WorkCenterLike, t: DateTime) {
  const dow = t.weekday % 7; // Luxon: Monday=1..Sunday=7 ; spec: Sunday=0..Saturday=6
  const specDow = dow === 0 ? 0 : dow; // Actually Luxon Sunday=7 -> 0
  const dayOfWeek = t.weekday === 7 ? 0 : t.weekday; // Sunday -> 0, Mon->1...
  // Find any shift that matches this day
  for (const s of wc.shifts) {
    if (s.dayOfWeek !== dayOfWeek) continue;

    const start = t.startOf("day").plus({ hours: s.startHour });
    const end = t.startOf("day").plus({ hours: s.endHour });

    if (t >= start && t < end) {
      return { start, end };
    }
  }
  return null;
}

function nextShiftStart(wc: WorkCenterLike, t: DateTime): DateTime {
  // scan forward up to 60 days (enough for test scenarios)
  let cursor = t;
  for (let i = 0; i < 60; i++) {
    const dayStart = cursor.startOf("day");
    const dayOfWeek = cursor.weekday === 7 ? 0 : cursor.weekday;

    // find earliest shift start for this day that is >= t
    let best: DateTime | null = null;
    for (const s of wc.shifts) {
      if (s.dayOfWeek !== dayOfWeek) continue;
      const start = dayStart.plus({ hours: s.startHour });
      if (start >= t && (best === null || start < best)) best = start;
    }
    if (best) return best;

    // move to next day 00:00
    cursor = dayStart.plus({ days: 1 });
    t = cursor;
  }
  throw new Error(
    "No shift found in search window. Check work center shift configuration.",
  );
}

function isInBlocked(wc: WorkCenterLike, t: DateTime): BlockedWindow | null {
  // blocked intervals should be sorted by start (we’ll sort once when building wc.blocked)
  for (const b of wc.blocked) {
    if (t < b.start) return null; // because sorted
    if (t >= b.start && t < b.end) return b;
  }
  return null;
}

export function nextWorkingInstant(wc: WorkCenterLike, t: DateTime): DateTime {
  let cursor = t;

  while (true) {
    // If inside blocked window, jump to its end
    const blk = isInBlocked(wc, cursor);
    if (blk) {
      cursor = blk.end;
      continue;
    }

    // If inside a shift, we’re good
    const sh = getShiftForInstant(wc, cursor);
    if (sh) return cursor;

    // Otherwise jump to next shift start
    cursor = nextShiftStart(wc, cursor);
  }
}

export function addWorkingMinutes(
  wc: WorkCenterLike,
  start: DateTime,
  minutes: number,
): DateTime {
  let remaining = minutes;
  let cursor = nextWorkingInstant(wc, start);

  while (remaining > 0) {
    // If blocked, jump
    const blk = isInBlocked(wc, cursor);
    if (blk) {
      cursor = blk.end;
      continue;
    }

    const sh = getShiftForInstant(wc, cursor);
    if (!sh) {
      cursor = nextShiftStart(wc, cursor);
      continue;
    }

    // Find next interruption: shift end or next blocked start
    let runUntil = sh.end;

    // next blocked that starts after cursor
    for (const b of wc.blocked) {
      if (b.start <= cursor) continue;
      if (b.start < runUntil) runUntil = b.start;
      break; // sorted: first one is earliest
    }

    const available = Math.max(
      0,
      Math.floor(runUntil.diff(cursor, "minutes").minutes),
    );
    if (available <= 0) {
      cursor = runUntil;
      continue;
    }

    if (remaining <= available) {
      return cursor.plus({ minutes: remaining });
    } else {
      remaining -= available;
      cursor = runUntil; // hit shift end or blocked start
    }
  }

  return cursor;
}

export const PENDING_OPEN_TIMEOUT_MS = 8000;

export interface PendingOpenEntry {
  timestamp: number;
  timedOut?: boolean;
}

export type PendingOpenStatus = "waiting" | "timedOut" | "confirmed";

export function getPendingOpenStatus(
  entry: PendingOpenEntry | undefined,
  now = Date.now()
): PendingOpenStatus | null {
  if (!entry) return null;
  if (entry.timedOut || now - entry.timestamp >= PENDING_OPEN_TIMEOUT_MS) {
    return "timedOut";
  }
  return "waiting";
}

export function markPendingOpenRequested(
  previous: Record<number, PendingOpenEntry>,
  lockerId: number,
  now = Date.now()
): Record<number, PendingOpenEntry> {
  return {
    ...previous,
    [lockerId]: {
      timestamp: now,
      timedOut: false,
    },
  };
}

export function advancePendingOpenTimeouts(
  previous: Record<number, PendingOpenEntry>,
  now = Date.now()
): Record<number, PendingOpenEntry> {
  const next: Record<number, PendingOpenEntry> = { ...previous };

  Object.entries(next).forEach(([lockerId, entry]) => {
    const key = Number(lockerId);
    if (entry.timedOut) {
      return;
    }
    if (now - entry.timestamp >= PENDING_OPEN_TIMEOUT_MS) {
      next[key] = { ...entry, timedOut: true };
    }
  });

  return next;
}

export function clearConfirmedPendingOpens(
  previous: Record<number, PendingOpenEntry>,
  currentLockers: Array<{ id: number; door?: string | null }>
): Record<number, PendingOpenEntry> {
  const confirmedIds = new Set(
    currentLockers
      .filter((locker) => locker.door === "open")
      .map((locker) => locker.id)
  );

  return Object.fromEntries(
    Object.entries(previous).filter(([lockerId]) => !confirmedIds.has(Number(lockerId)))
  );
}

export function markPendingOpenTimedOut(
  previous: Record<number, PendingOpenEntry>,
  lockerId: number
): Record<number, PendingOpenEntry> {
  if (!previous[lockerId]) {
    return previous;
  }

  return {
    ...previous,
    [lockerId]: {
      ...previous[lockerId],
      timedOut: true,
    },
  };
}

export function markPendingOpenConfirmed(
  previous: Record<number, PendingOpenEntry>,
  lockerId: number
): Record<number, PendingOpenEntry> {
  const next = { ...previous };
  delete next[lockerId];
  return next;
}

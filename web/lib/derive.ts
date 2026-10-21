import type { Locker, LogEntry } from "./types";

export interface LockerMetrics {
  total: number;
  available: number;
  occupied: number;
  open: number;
  deniedAttempts: number;
}

export type LockerStatusLabel = "Available" | "Occupied" | "Open";

export interface LockerStatusSegment {
  label: LockerStatusLabel;
  count: number;
  percentage: number;
}

export function deriveLockerMetrics(
  lockers: readonly Locker[],
  logs: readonly LogEntry[]
): LockerMetrics {
  return {
    total: lockers.length,
    available: lockers.filter((locker) => !locker.owner_tag).length,
    occupied: lockers.filter((locker) => Boolean(locker.owner_tag)).length,
    open: lockers.filter((locker) => locker.door === "open").length,
    deniedAttempts: deriveDeniedAttempts(logs),
  };
}

export function deriveDeniedAttempts(logs: readonly LogEntry[]): number {
  return logs.filter((log) => log.result === "DENIED").length;
}

export function deriveLockerStatusSegments(
  lockers: readonly Locker[]
): LockerStatusSegment[] {
  const counts: Record<LockerStatusLabel, number> = {
    Available: 0,
    Occupied: 0,
    Open: 0,
  };

  lockers.forEach((locker) => {
    if (locker.door === "open") {
      counts.Open += 1;
    } else if (locker.owner_tag) {
      counts.Occupied += 1;
    } else {
      counts.Available += 1;
    }
  });

  const labels: LockerStatusLabel[] = ["Available", "Occupied", "Open"];
  const total = lockers.length;
  const percentages = labels.map((label) =>
    total === 0 ? 0 : (counts[label] * 100) / total
  );
  const rounded = percentages.map(Math.floor);
  let remainder = total === 0 ? 0 : 100 - rounded.reduce((sum, value) => sum + value, 0);

  const largestRemainders = percentages
    .map((percentage, index) => ({
      index,
      fraction: percentage - Math.floor(percentage),
    }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let index = 0; index < largestRemainders.length && remainder > 0; index += 1) {
    rounded[largestRemainders[index].index] += 1;
    remainder -= 1;
  }

  return labels.map((label, index) => ({
    label,
    count: counts[label],
    percentage: rounded[index],
  }));
}

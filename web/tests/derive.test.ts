import { describe, expect, it } from "vitest";
import {
  deriveDeniedAttempts,
  deriveLockerMetrics,
  deriveLockerStatusSegments,
} from "../lib/derive";
import type { Locker, LogEntry } from "../lib/types";

const locker = (id: number, owner_tag: string | null, door: Locker["door"] = "locked"): Locker => ({
  id,
  owner_tag,
  assigned_at: null,
  door,
  door_changed: null,
  door_by: null,
  name: null,
});

const log = (id: number, result: LogEntry["result"]): LogEntry => ({
  id,
  time: "2026-10-15 09:00:00",
  tag: null,
  locker_id: null,
  result,
  detail: null,
  name: null,
});

describe("dashboard data derivations", () => {
  it("returns zero counts and zero percentages for no lockers", () => {
    expect(deriveLockerMetrics([], [])).toEqual({
      total: 0,
      available: 0,
      occupied: 0,
      open: 0,
      deniedAttempts: 0,
    });
    expect(deriveLockerStatusSegments([])).toEqual([
      { label: "Available", count: 0, percentage: 0 },
      { label: "Occupied", count: 0, percentage: 0 },
      { label: "Open", count: 0, percentage: 0 },
    ]);
  });

  it("counts all owned lockers as occupied", () => {
    expect(
      deriveLockerMetrics(
        [locker(1, "01 02 03 04"), locker(2, "05 06 07 08")],
        []
      )
    ).toMatchObject({ total: 2, available: 0, occupied: 2, open: 0 });
  });

  it("assigns each open locker to one donut category", () => {
    expect(
      deriveLockerStatusSegments([
        locker(1, null),
        locker(2, "01 02 03 04"),
        locker(3, null, "open"),
      ])
    ).toEqual([
      { label: "Available", count: 1, percentage: 34 },
      { label: "Occupied", count: 1, percentage: 33 },
      { label: "Open", count: 1, percentage: 33 },
    ]);
  });

  it("rounds segment percentages so they sum to 100", () => {
    const segments = deriveLockerStatusSegments([
      locker(1, null),
      locker(2, null),
      locker(3, "01 02 03 04"),
      locker(4, null, "open"),
      locker(5, "05 06 07 08"),
      locker(6, null),
      locker(7, null),
    ]);

    expect(segments.reduce((sum, segment) => sum + segment.percentage, 0)).toBe(100);
  });

  it("counts only denied entries in the accumulated log list", () => {
    const logs = [log(1, "DENIED"), log(2, "GRANTED"), log(3, "DENIED")];
    expect(deriveDeniedAttempts(logs)).toBe(2);
    expect(deriveDeniedAttempts([])).toBe(0);
  });
});

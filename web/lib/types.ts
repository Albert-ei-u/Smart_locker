export type KnownLogResult =
  | "GRANTED"
  | "DENIED"
  | "LOCKED"
  | "ASSIGNED"
  | "RELEASED"
  | "REMOTE OPEN";

export type LogResult = KnownLogResult | (string & {});

export interface Locker {
  id: number;
  owner_tag: string | null;
  assigned_at: string | null;
  door: "locked" | "open";
  door_changed: string | null;
  door_by: string | null;
  name: string | null;
}

export interface LogEntry {
  id: number;
  time: string;
  tag: string | null;
  locker_id: number | null;
  result: LogResult;
  detail: string | null;
  name: string | null;
}

export interface User {
  tag: string;
  name: string;
  locker_id?: number | null;
}

export interface StatusResponse {
  lockers: Locker[];
  logs: LogEntry[];
}

export interface BffResult {
  ok: boolean;
  message: string;
}

export interface UsersResponse {
  users: User[];
  error?: string;
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import {
  LogEntry,
  StatusResponse,
  User,
  UsersResponse,
  BffResult,
} from "@/lib/types";
import {
  advancePendingOpenTimeouts,
  clearConfirmedPendingOpens,
  markPendingOpenRequested,
  type PendingOpenEntry,
} from "@/lib/pending-open";

const MAX_LOGS = 200;

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(
      errorData.error || errorData.message || `HTTP ${res.status}`
    );
    (error as Error & { status?: number; data?: unknown }).status = res.status;
    (error as Error & { status?: number; data?: unknown }).data = errorData;
    throw error;
  }
  return res.json();
};

export interface ToastItem {
  id: string;
  kind: "open" | "ok" | "bad" | "info";
  message: string;
}

export function useDashboard(
  initialStatus: StatusResponse | null,
  initialUsers: User[] | null,
  initialUsersError?: string | null
) {
  const [accumulatedLogs, setAccumulatedLogs] = useState<LogEntry[]>(
    initialStatus?.logs || []
  );
  const [newLogIds, setNewLogIds] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingOpenMap, setPendingOpenMap] = useState<
    Record<number, PendingOpenEntry>
  >({});
  const [registerTagPrefill, setRegisterTagPrefill] = useState<{
    tag: string;
    nonce: number;
  } | null>(null);

  const isFirstLoadRef = useRef(true);
  const prevDoorsRef = useRef<Record<number, string>>({});
  const lastSeenLogIdRef = useRef<number | null>(
    initialStatus?.logs?.[0]?.id ?? null
  );
  const highlightTimersRef = useRef<number[]>([]);
  const statusFailureCountRef = useRef(0);

  const addToast = useCallback(
    (message: string, kind: ToastItem["kind"] = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, kind, message }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const timers = highlightTimersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const {
    data: statusData,
    error: statusError,
    mutate: mutateStatus,
  } = useSWR<StatusResponse>("/api/status", fetcher, {
    fallbackData: initialStatus ?? undefined,
    refreshInterval: () => {
      if (statusError) {
        const delay = Math.min(2000 * 2 ** statusFailureCountRef.current, 10000);
        return delay;
      }
      return 2000;
    },
    refreshWhenHidden: false,
    revalidateOnFocus: true,
    keepPreviousData: true,
    shouldRetryOnError: false,
    onSuccess: (data) => {
      statusFailureCountRef.current = 0;
      const currentLockers = data.lockers || [];
      const currentLogs = data.logs || [];

      const newEntries = currentLogs.filter(
        (log) => !accumulatedLogs.some((entry) => entry.id === log.id)
      );
      if (newEntries.length > 0) {
        setNewLogIds((prev) => {
          const next = new Set(prev);
          newEntries.forEach((log) => next.add(log.id));
          return next;
        });

        const timer = window.setTimeout(() => {
          setNewLogIds((prev) => {
            const next = new Set(prev);
            newEntries.forEach((log) => next.delete(log.id));
            return next;
          });
        }, 2000);
        highlightTimersRef.current.push(timer);
      }

      setAccumulatedLogs((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        const nextEntries = currentLogs.filter((log) => !existingIds.has(log.id));
        if (nextEntries.length === 0) return prev;
        return [...nextEntries, ...prev].slice(0, MAX_LOGS);
      });

      setPendingOpenMap((prev) => clearConfirmedPendingOpens(prev, currentLockers));

      if (isFirstLoadRef.current) {
        const initialDoors: Record<number, string> = {};
        currentLockers.forEach((l) => {
          initialDoors[l.id] = l.door;
        });
        prevDoorsRef.current = initialDoors;
        if (currentLogs.length > 0) {
          lastSeenLogIdRef.current = currentLogs[0].id;
        }
        isFirstLoadRef.current = false;
        return;
      }

      currentLockers.forEach((l) => {
        const prevDoor = prevDoorsRef.current[l.id];
        const currentDoor = l.door;

        if (prevDoor && prevDoor !== currentDoor) {
          if (currentDoor === "open") {
            addToast(
              `Locker ${l.id} opened by ${l.door_by || "someone"}`,
              "open"
            );
            setPendingOpenMap((prev) => {
              const next = { ...prev };
              delete next[l.id];
              return next;
            });
          } else if (currentDoor === "locked") {
            addToast(`Locker ${l.id} closed and locked`, "ok");
          }
        }

        prevDoorsRef.current[l.id] = currentDoor;
      });

      const lastId = lastSeenLogIdRef.current;
      if (lastId !== null) {
        currentLogs.forEach((g) => {
          if (g.id > lastId && g.result === "DENIED") {
            addToast(
              `Access denied: ${g.name || g.tag || "Unknown"} (${g.detail || "denied"})`,
              "bad"
            );
          }
        });
      }

      if (currentLogs.length > 0) {
        lastSeenLogIdRef.current = Math.max(
          lastSeenLogIdRef.current ?? 0,
          currentLogs[0].id
        );
      }
    },
    onError: () => {
      statusFailureCountRef.current = Math.min(
        (statusFailureCountRef.current || 0) + 1,
        5
      );
    },
  });

  const {
    data: usersData,
    error: usersError,
    mutate: mutateUsers,
  } = useSWR<UsersResponse>("/api/users", fetcher, {
    fallbackData: initialUsers ? { users: initialUsers } : undefined,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const usersLoadTried =
    Boolean(initialUsers) ||
    Boolean(initialUsersError) ||
    Boolean(usersData) ||
    Boolean(usersError);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPendingOpenMap((prev) => advancePendingOpenTimeouts(prev, Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isLive = !statusError && Boolean(statusData);

  const usersScraperError =
    (usersError?.data?.error === "users_unreadable" && usersLoadTried) ||
    (!usersLoadTried && initialUsersError === "users_unreadable");

  const usersWithLockers: User[] = (usersData?.users || []).map((user) => {
    const assignedLocker = statusData?.lockers.find(
      (l) => l.owner_tag === user.tag
    );
    return {
      ...user,
      locker_id: assignedLocker ? assignedLocker.id : null,
    };
  });

  const addUser = async (name: string, tag: string): Promise<BffResult> => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag }),
      });
      const data: BffResult = await res.json();
      addToast(data.message, data.ok ? "ok" : "bad");
      if (data.ok) {
        await Promise.all([mutateUsers(), mutateStatus()]);
      }
      return data;
    } catch {
      const msg = "Failed to communicate with server";
      addToast(msg, "bad");
      return { ok: false, message: msg };
    }
  };

  const removeUser = async (tag: string): Promise<BffResult> => {
    try {
      const res = await fetch("/api/users/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      const data: BffResult = await res.json();
      addToast(data.message, data.ok ? "ok" : "bad");
      if (data.ok) {
        await Promise.all([mutateUsers(), mutateStatus()]);
      }
      return data;
    } catch {
      const msg = "Failed to communicate with server";
      addToast(msg, "bad");
      return { ok: false, message: msg };
    }
  };

  const assignLocker = async (
    lockerId: number,
    tag: string
  ): Promise<BffResult> => {
    try {
      const res = await fetch(`/api/lockers/${lockerId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      const data: BffResult = await res.json();
      addToast(data.message, data.ok ? "ok" : "bad");
      if (data.ok) {
        await Promise.all([mutateUsers(), mutateStatus()]);
      }
      return data;
    } catch {
      const msg = "Failed to communicate with server";
      addToast(msg, "bad");
      return { ok: false, message: msg };
    }
  };

  const releaseLocker = async (lockerId: number): Promise<BffResult> => {
    try {
      const res = await fetch(`/api/lockers/${lockerId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data: BffResult = await res.json();
      addToast(data.message, data.ok ? "ok" : "bad");
      if (data.ok) {
        await Promise.all([mutateUsers(), mutateStatus()]);
      }
      return data;
    } catch {
      const msg = "Failed to communicate with server";
      addToast(msg, "bad");
      return { ok: false, message: msg };
    }
  };

  const openLocker = async (lockerId: number): Promise<BffResult> => {
    setPendingOpenMap((prev) => markPendingOpenRequested(prev, lockerId, Date.now()));

    try {
      const res = await fetch(`/api/lockers/${lockerId}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data: BffResult = await res.json();
      addToast(data.message, data.ok ? "open" : "bad");
      if (!data.ok) {
        setPendingOpenMap((prev) => {
          const next = { ...prev };
          delete next[lockerId];
          return next;
        });
      } else {
        await mutateStatus();
      }
      return data;
    } catch {
      const msg = "Failed to communicate with server";
      addToast(msg, "bad");
      setPendingOpenMap((prev) => {
        const next = { ...prev };
        delete next[lockerId];
        return next;
      });
      return { ok: false, message: msg };
    }
  };

  const dismissOpeningTimeout = (lockerId: number) => {
    setPendingOpenMap((prev) => {
      const next = { ...prev };
      delete next[lockerId];
      return next;
    });
  };

  return {
    lockers: statusData?.lockers || [],
    logs: accumulatedLogs,
    newLogIds,
    users: usersWithLockers,
    isLive,
    usersScraperError,
    toasts,
    pendingOpenMap,
    registerTagPrefill,
    setRegisterTagPrefill,
    addToast,
    removeToast,
    dismissOpeningTimeout,
    addUser,
    removeUser,
    assignLocker,
    releaseLocker,
    openLocker,
  };
}

"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Download,
  Info,
  Lock,
  Search,
  ShieldAlert,
  Smartphone,
  Undo2,
  Unlock,
  User,
  UserPlus,
} from "lucide-react";
import type { LogEntry } from "@/lib/types";
import { buildCsv } from "@/lib/csv";
import { SectionCard } from "./SectionCard";

export type ActivityFilter = "all" | "access" | "denied" | "admin";

interface ActivityFeedProps {
  logs: LogEntry[];
  newLogIds: Set<number>;
  onRegisterTag: (tag: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  filter?: ActivityFilter;
  onFilterChange?: (filter: ActivityFilter) => void;
}

const filters: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "access", label: "Access" },
  { id: "denied", label: "Denied" },
  { id: "admin", label: "Admin" },
];

export function ActivityFeed({
  logs,
  newLogIds,
  onRegisterTag,
  searchInputRef,
  filter,
  onFilterChange,
}: ActivityFeedProps) {
  const [localFilter, setLocalFilter] = useState<ActivityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const feedListRef = useRef<HTMLUListElement>(null);
  const activeFilter = filter ?? localFilter;
  const recentDeniedIds = new Set(
    logs.filter((log) => log.result === "DENIED").slice(0, 4).map((log) => log.id)
  );

  const chooseFilter = (nextFilter: ActivityFilter) => {
    setLocalFilter(nextFilter);
    onFilterChange?.(nextFilter);
  };

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (activeFilter === "access" && log.result !== "GRANTED" && log.result !== "LOCKED") {
          return false;
        }
        if (activeFilter === "denied" && log.result !== "DENIED") return false;
        if (
          activeFilter === "admin" &&
          log.result !== "ASSIGNED" &&
          log.result !== "RELEASED" &&
          log.result !== "REMOTE OPEN"
        ) {
          return false;
        }

        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return [
          log.name || "",
          log.tag || "",
          log.result || "",
          log.detail || "",
          log.locker_id ? `locker ${log.locker_id}` : "",
        ].some((value) => value.toLowerCase().includes(query));
      }),
    [logs, activeFilter, searchQuery]
  );

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = ["ID", "Time", "Result", "Locker ID", "Name", "Tag", "Detail"];
    const rows = [
      headers,
      ...logs.map((log) => [
        log.id,
        log.time,
        log.result,
        log.locker_id ?? "",
        log.name || "",
        log.tag || "",
        log.detail || "",
      ]),
    ];
    const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `locker_activity_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case "GRANTED":
        return <Unlock className="event-icon event-icon--open" size={17} />;
      case "LOCKED":
        return <Lock className="event-icon event-icon--success" size={17} />;
      case "DENIED":
        return <ShieldAlert className="event-icon event-icon--denied" size={17} />;
      case "REMOTE OPEN":
        return <Smartphone className="event-icon" size={17} />;
      case "ASSIGNED":
        return <User className="event-icon" size={17} />;
      case "RELEASED":
        return <Undo2 className="event-icon" size={17} />;
      default:
        return <Info className="event-icon" size={17} />;
    }
  };

  return (
    <SectionCard
      id="activity"
      title="Live activity"
      className="activity-section"
      action={
        <div className="activity-toolbar">
          <label className="feed-search">
            <Search size={14} aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search activity"
              aria-label="Filter activity feed"
            />
          </label>
          <div className="filter-control" aria-label="Activity filters">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseFilter(item.id)}
                aria-pressed={activeFilter === item.id}
                className={activeFilter === item.id ? "is-selected" : ""}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="icon-button"
            title="Export accumulated activity to CSV"
            aria-label="Export activity to CSV"
          >
            <Download size={16} aria-hidden="true" />
          </button>
        </div>
      }
    >
      <ul
        ref={feedListRef}
        className="feed-list"
        aria-label="Recent activity logs"
      >
        {filteredLogs.length === 0 ? (
          <li className="empty-state">
            {logs.length === 0
              ? "No activity yet. Tap a fob!"
              : "No matching activity found."}
          </li>
        ) : (
          filteredLogs.map((log) => {
            const isUnknownDenied =
              log.result === "DENIED" &&
              Boolean(log.tag) &&
              (!log.name || log.detail?.toLowerCase().includes("unknown tag"));

            return (
              <li
                key={log.id}
                className={`feed-row ${newLogIds.has(log.id) ? "is-new" : ""}`}
              >
                {getResultIcon(log.result)}
                <div className="feed-copy">
                  <div className="feed-primary">
                    <strong>
                      {log.result}
                      {log.locker_id ? ` · Locker ${log.locker_id}` : ""}
                    </strong>
                    {log.tag && <code>{log.tag}</code>}
                    <span className="feed-detail">
                      {log.name || log.tag || "Dashboard"}
                      {log.detail ? ` — ${log.detail}` : ""}
                    </span>
                  </div>
                  {isUnknownDenied && log.tag && !recentDeniedIds.has(log.id) && (
                    <button
                      type="button"
                      onClick={() => onRegisterTag(log.tag!)}
                      className="button button-ghost feed-register"
                      title={`Register tag ${log.tag}`}
                    >
                      <UserPlus size={14} aria-hidden="true" />
                      Register this tag
                    </button>
                  )}
                </div>
                <time dateTime={log.time}>{log.time}</time>
              </li>
            );
          })
        )}
      </ul>
    </SectionCard>
  );
}

"use client";

import React from "react";
import { AlertTriangle, UserPlus } from "lucide-react";
import type { LogEntry } from "@/lib/types";
import { SectionCard } from "./SectionCard";

interface AlertsPanelProps {
  logs: LogEntry[];
  onRegisterTag: (tag: string) => void;
  onViewAll: () => void;
}

function getAlertTitle(detail: string | null): string {
  if (detail?.toLowerCase().includes("unknown tag")) return "Unknown tag";
  if (detail?.toLowerCase().includes("no locker")) return "No locker assigned";
  return "Denied access";
}

export function AlertsPanel({
  logs,
  onRegisterTag,
  onViewAll,
}: AlertsPanelProps) {
  const alerts = logs.filter((log) => log.result === "DENIED").slice(0, 4);

  return (
    <SectionCard
      title="Alerts"
      action={
        <button type="button" className="quiet-link" onClick={onViewAll}>
          View all
        </button>
      }
    >
      {alerts.length === 0 ? (
        <p className="empty-state">No alerts. Denied attempts appear here.</p>
      ) : (
        <ul className="alert-list">
          {alerts.map((log) => {
            const isUnknownTag =
              Boolean(log.tag) &&
              (!log.name || log.detail?.toLowerCase().includes("unknown tag"));

            return (
              <li className="alert-row" key={log.id}>
                <AlertTriangle
                  className="alert-icon"
                  aria-hidden="true"
                  size={16}
                />
                <div className="alert-content">
                  <strong>{getAlertTitle(log.detail)}</strong>
                  <p>
                    {log.tag && <code>{log.tag}</code>}
                    {log.detail && (
                      <span>{log.tag ? ` · ${log.detail}` : log.detail}</span>
                    )}
                  </p>
                  {isUnknownTag && log.tag && (
                    <button
                      type="button"
                      className="button button-ghost alert-register"
                      onClick={() => onRegisterTag(log.tag!)}
                    >
                      <UserPlus size={14} />
                      Register this tag
                    </button>
                  )}
                </div>
                <time className="alert-time" dateTime={log.time}>
                  {log.time}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

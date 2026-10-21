"use client";

import React from "react";
import { deriveLockerStatusSegments } from "@/lib/derive";
import type { Locker } from "@/lib/types";
import { SectionCard } from "./SectionCard";

interface LockerStatusPanelProps {
  lockers: Locker[];
  isLive: boolean;
}

const COLORS = {
  Available: "var(--success)",
  Occupied: "var(--neutral)",
  Open: "var(--warning)",
} as const;

export function LockerStatusPanel({ lockers, isLive }: LockerStatusPanelProps) {
  const segments = deriveLockerStatusSegments(lockers);

  return (
    <SectionCard title="Locker status">
      <div className="section-card-body">
        <div className="donut-layout">
          <svg
            className="status-donut"
            viewBox="0 0 120 120"
            role="img"
            aria-label={segments
              .map(({ label, count, percentage }) => `${label}: ${count} (${percentage}%)`)
              .join(", ")}
          >
            <circle
              cx="60"
              cy="60"
              r="42"
              fill="none"
              stroke="var(--surface-2)"
              strokeWidth="12"
            />
            {segments.map((segment, index) => {
              const currentOffset = -segments
                .slice(0, index)
                .reduce((sum, previous) => sum + previous.percentage, 0);
              return (
                <circle
                  key={segment.label}
                  cx="60"
                  cy="60"
                  r="42"
                  fill="none"
                  stroke={COLORS[segment.label]}
                  strokeWidth="12"
                  pathLength="100"
                  strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
                  strokeDashoffset={currentOffset}
                  transform="rotate(-90 60 60)"
                />
              );
            })}
            <text
              x="60"
              y="57"
              textAnchor="middle"
              className="donut-total"
            >
              {lockers.length}
            </text>
            <text
              x="60"
              y="73"
              textAnchor="middle"
              className="donut-caption"
            >
              lockers
            </text>
          </svg>

          <div className="donut-legend" aria-hidden="true">
            {segments.map(({ label, count, percentage }) => (
              <div className="legend-row" key={label}>
                <span className="legend-label">
                  <span className={`legend-dot ${label.toLowerCase()}`} />
                  {label}
                </span>
                <span className="tabular-nums">{count}</span>
                <span className="tabular-nums">{percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="connection-footer">
          <span className={`connection-dot ${isLive ? "is-live" : ""}`} />
          <span>{isLive ? "Server connected" : "Offline"}</span>
        </div>
      </div>
    </SectionCard>
  );
}

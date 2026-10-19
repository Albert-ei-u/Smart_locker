"use client";

import React from "react";
import { Check, Package, ShieldAlert, Unlock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { deriveLockerMetrics } from "@/lib/derive";
import type { Locker, LogEntry } from "@/lib/types";

interface StatsStripProps {
  lockers: Locker[];
  logs: LogEntry[];
}

interface KpiCardProps {
  label: string;
  value: number;
  caption: string;
  icon: LucideIcon;
}

function KpiCard({ label, value, caption, icon: Icon }: KpiCardProps) {
  return (
    <article className="surface-card kpi-card">
      <div className="kpi-icon">
        <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
      </div>
      <div className="kpi-copy">
        <span className="kpi-label">{label}</span>
        <strong className="kpi-value">{value}</strong>
        <span className="kpi-caption">{caption}</span>
      </div>
    </article>
  );
}

export function StatsStrip({ lockers, logs }: StatsStripProps) {
  const metrics = deriveLockerMetrics(lockers, logs);
  const openLockers = lockers
    .filter((locker) => locker.door === "open")
    .map((locker) => `Locker ${locker.id}`);

  return (
    <div className="kpi-grid section-space" aria-label="Locker overview">
      <KpiCard
        label="Available"
        value={metrics.available}
        caption={`of ${metrics.total} lockers`}
        icon={Check}
      />
      <KpiCard
        label="Occupied"
        value={metrics.occupied}
        caption={`of ${metrics.total} lockers`}
        icon={Package}
      />
      <KpiCard
        label="Doors open now"
        value={metrics.open}
        caption={openLockers.length > 0 ? openLockers.join(", ") : "All doors locked"}
        icon={Unlock}
      />
      <KpiCard
        label="Denied attempts"
        value={metrics.deniedAttempts}
        caption="in recent activity"
        icon={ShieldAlert}
      />
    </div>
  );
}

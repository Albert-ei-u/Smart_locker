"use client";

import React, { useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import type { StatusResponse, User } from "@/lib/types";
import { useDashboard } from "@/hooks/useDashboard";
import { getPendingOpenStatus } from "@/lib/pending-open";
import { Header } from "./Header";
import { Banner } from "./Banner";
import { StatsStrip } from "./StatsStrip";
import { LockerCard } from "./LockerCard";
import { ActivityFeed, type ActivityFilter } from "./ActivityFeed";
import { AlertsPanel } from "./AlertsPanel";
import { LockerStatusPanel } from "./LockerStatusPanel";
import { UsersPanel } from "./UsersPanel";
import { ToastContainer } from "./ToastContainer";

interface DashboardProps {
  initialStatus: StatusResponse | null;
  initialUsers: User[] | null;
  initialUsersError?: string | null;
}

export function Dashboard({
  initialStatus,
  initialUsers,
  initialUsersError,
}: DashboardProps) {
  const {
    lockers,
    logs,
    newLogIds,
    users,
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
  } = useDashboard(initialStatus, initialUsers, initialUsersError);

  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select"
      ) {
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        document.getElementById("theme-toggle")?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRegisterTagFromFeed = (tag: string) => {
    setRegisterTagPrefill((prev) => ({
      tag,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
    document.getElementById("users")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 400);
  };

  return (
    <div className="app-shell">
      <Header isLive={isLive} />

      <main className="page-container dashboard-main">
        <div className="page-heading">
          <h1>Overview</h1>
          <p>Live locker status and access activity</p>
        </div>

        <Banner isLive={isLive} usersScraperError={usersScraperError} />
        <StatsStrip lockers={lockers} logs={logs} />

        <section id="lockers" className="section-space scroll-mt-20">
          <div className="section-heading">
            <h2 className="section-title section-title-with-icon">
              <LayoutGrid size={16} aria-hidden="true" />
              Lockers
            </h2>
            <span className="section-count">
              {lockers.length} {lockers.length === 1 ? "locker" : "lockers"}
            </span>
          </div>

          <div className="locker-grid">
            {lockers.map((locker) => {
              const pendingState = getPendingOpenStatus(pendingOpenMap[locker.id]);

              return (
                <LockerCard
                  key={locker.id}
                  locker={locker}
                  users={users}
                  isLive={isLive}
                  isOpening={pendingState === "waiting"}
                  isTimedOut={pendingState === "timedOut"}
                  onDismissTimeout={dismissOpeningTimeout}
                  onAssign={assignLocker}
                  onRelease={releaseLocker}
                  onOpen={openLocker}
                  onCopyFailed={(message) => addToast(message, "info")}
                />
              );
            })}
          </div>
        </section>

        <div className="dashboard-insights">
          <ActivityFeed
            logs={logs}
            newLogIds={newLogIds}
            onRegisterTag={handleRegisterTagFromFeed}
            searchInputRef={searchInputRef}
            filter={activityFilter}
            onFilterChange={setActivityFilter}
          />
          <div className="insight-stack">
            <LockerStatusPanel lockers={lockers} isLive={isLive} />
            <AlertsPanel
              logs={logs}
              onRegisterTag={handleRegisterTagFromFeed}
              onViewAll={() => setActivityFilter("denied")}
            />
          </div>
        </div>

        <UsersPanel
          users={users}
          onAddUser={addUser}
          onRemoveUser={removeUser}
          prefillTag={registerTagPrefill}
          nameInputRef={nameInputRef}
          onCopyFailed={(message) => addToast(message, "info")}
        />
      </main>

      <footer className="app-footer">
        <div className="page-container">Team 5 · Y2 Robotics Club</div>
      </footer>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

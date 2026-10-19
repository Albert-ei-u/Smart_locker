"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Lock, Moon, Sun } from "lucide-react";

interface HeaderProps {
  isLive: boolean;
}

type SectionId = "lockers" | "activity" | "users";

const sections: { id: SectionId; label: string }[] = [
  { id: "lockers", label: "Lockers" },
  { id: "activity", label: "Activity" },
  { id: "users", label: "Users" },
];

function subscribeTheme(callback: () => void) {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getThemeSnapshot(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function Header({ isLive }: HeaderProps) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => "dark"
  );
  const [activeSection, setActiveSection] = useState<SectionId>("lockers");

  useEffect(() => {
    const targets = sections
      .map(({ id }) => document.getElementById(id))
      .filter((target): target is HTMLElement => Boolean(target));
    if (!("IntersectionObserver" in window) || targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id as SectionId);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0, 0.25, 0.5] }
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";

  const toggleTheme = () => {
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {
      // The in-memory theme still toggles if storage is unavailable.
    }
  };

  return (
    <header className="app-header">
      <div className="page-container header-inner">
        <a href="#" className="brand-link" aria-label="Smart Locker overview">
          <span className="brand-mark">
            <Lock size={18} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span className="brand-copy">
            <strong>Team 5 · Smart Locker</strong>
            <small>Y2 Robotics Club · locker.robotics.local</small>
          </span>
        </a>

        <nav className="header-nav" aria-label="Section navigation">
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeSection === id ? "is-active" : ""}
              aria-current={activeSection === id ? "location" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="header-controls">
          <div className={`connection-indicator ${isLive ? "is-live" : ""}`}>
            <span className={`connection-dot ${isLive ? "is-live" : ""}`} />
            <span>{isLive ? "Server connected" : "Reconnecting…"}</span>
          </div>
          <button
            id="theme-toggle"
            type="button"
            onClick={toggleTheme}
            className="theme-toggle"
            title={`Switch to ${nextTheme} mode (Shortcut: 't')`}
            aria-label={`Switch to ${nextTheme} mode`}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
}

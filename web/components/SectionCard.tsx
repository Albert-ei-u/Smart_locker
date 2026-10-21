"use client";

import React from "react";

interface SectionCardProps {
  id?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  id,
  title,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section id={id} className={`section-space min-w-0 ${className}`}>
      <div className="surface-card overflow-hidden">
        <header className="section-card-header">
          <h2 className="section-title">{title}</h2>
          {action}
        </header>
        {children}
      </div>
    </section>
  );
}

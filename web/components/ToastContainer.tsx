"use client";

import React, { useEffect } from "react";
import { Lock, Unlock, ShieldAlert, Info, X } from "lucide-react";
import { ToastItem } from "@/hooks/useDashboard";

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <>
      {/* Screen reader live region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="aria-live-toasts"
      >
        {toasts.length > 0 ? toasts[toasts.length - 1].message : ""}
      </div>

      <div
        id="toasts"
        className="toast-container"
      >
        {toasts.map((toast) => (
          <SingleToast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}

function SingleToast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
    switch (toast.kind) {
      case "open":
        return <Unlock className="toast-icon is-warning" size={17} />;
      case "ok":
        return <Lock className="toast-icon is-success" size={17} />;
      case "bad":
        return <ShieldAlert className="toast-icon is-danger" size={17} />;
      default:
        return <Info className="toast-icon" size={17} />;
    }
  };

  return (
    <div
      role="status"
      className={`toast-item toast-shadow ${toast.kind}`}
    >
      <div className="toast-copy">
        {getIcon()}
        <span>
          {toast.message}
        </span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="icon-button"
        aria-label="Dismiss toast"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      lastFocusedRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!dialog.open) {
        dialog.showModal();
      }
      requestAnimationFrame(() => {
        confirmButtonRef.current?.focus();
      });
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
    requestAnimationFrame(() => {
      lastFocusedRef.current?.focus();
    });
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      open={isOpen}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="confirm-dialog"
    >
      <div className="dialog-inner">
        <div className="dialog-heading">
          <div className="dialog-title-group">
            <span className={`dialog-icon ${isDestructive ? "is-danger" : ""}`}>
              <AlertTriangle size={18} aria-hidden="true" />
            </span>
            <h3>{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="icon-button dialog-close"
            aria-label="Close dialog"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <p className="dialog-message">{message}</p>

        <div className="dialog-actions">
          <button
            type="button"
            onClick={onClose}
            className="button button-secondary"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`button ${isDestructive ? "button-danger" : "button-primary"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Lock,
  Unlock,
  UserRound,
  UserRoundPlus,
  X,
} from "lucide-react";
import type { Locker, User } from "@/lib/types";
import { copyText } from "@/lib/copy-text";
import { ConfirmDialog } from "./ConfirmDialog";

interface LockerCardProps {
  locker: Locker;
  users: User[];
  isLive: boolean;
  isOpening: boolean;
  isTimedOut: boolean;
  onDismissTimeout: (lockerId: number) => void;
  onAssign: (lockerId: number, tag: string) => Promise<unknown>;
  onRelease: (lockerId: number) => Promise<unknown>;
  onOpen: (lockerId: number) => Promise<unknown>;
  onCopyFailed?: (message: string) => void;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  isDestructive: boolean;
  confirmAction: () => void;
}

export function LockerCard({
  locker,
  users,
  isLive,
  isOpening,
  isTimedOut,
  onDismissTimeout,
  onAssign,
  onRelease,
  onOpen,
  onCopyFailed,
}: LockerCardProps) {
  const [selectedTag, setSelectedTag] = useState("");
  const [copiedTag, setCopiedTag] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    isDestructive: false,
    confirmAction: () => {},
  });

  const isOccupied = Boolean(locker.owner_tag);
  const isOpen = locker.door === "open";
  const selectedTagValue = users.some((user) => user.tag === selectedTag)
    ? selectedTag
    : "";
  const status = isOpen
    ? "Open"
    : isOccupied
      ? "Occupied"
      : "Available";
  const statusClass = isOpen ? "status-open" : isOccupied ? "" : "status-available";
  const stateClass = isOpening && !isOpen
    ? "state-waiting"
    : isOpen
      ? "state-open"
      : isOccupied
        ? "state-occupied"
        : "state-available";
  const stateCaption = isOpen
    ? `Opened by ${locker.door_by || "someone"}${
        locker.door_changed ? ` at ${locker.door_changed.slice(11)}` : ""
      }`
    : isOpening
      ? "Waiting for board confirmation..."
      : "Closed and secure";

  const handleAssignClick = (event: React.FormEvent) => {
    event.preventDefault();
    const chosenTag = users.some((user) => user.tag === selectedTag)
      ? selectedTag
      : "";
    if (!chosenTag) return;

    const chosenUser = users.find((user) => user.tag === chosenTag);
    const chosenName = chosenUser ? chosenUser.name : chosenTag;

    if (isOccupied) {
      setDialogState({
        isOpen: true,
        title: `Reassign Locker ${locker.id}`,
        message: `Locker ${locker.id} belongs to ${
          locker.name || "another user"
        }. Assigning it to ${chosenName} will replace them.`,
        isDestructive: true,
        confirmAction: async () => {
          await onAssign(locker.id, chosenTag);
          setSelectedTag("");
        },
      });
      return;
    }

    onAssign(locker.id, chosenTag);
    setSelectedTag("");
  };

  const handleReleaseClick = () => {
    if (!isOccupied) return;
    setDialogState({
      isOpen: true,
      title: `Release Locker ${locker.id}`,
      message: `Release Locker ${locker.id} from ${
        locker.name || "the current owner"
      }?`,
      isDestructive: true,
      confirmAction: () => onRelease(locker.id),
    });
  };

  const handleOpenClick = () => {
    setDialogState({
      isOpen: true,
      title: `Unlock Locker ${locker.id}`,
      message: `Unlock Locker ${locker.id} now? It cannot be cancelled once queued.`,
      isDestructive: false,
      confirmAction: () => onOpen(locker.id),
    });
  };

  const handleCopyTag = async () => {
    if (!locker.owner_tag) return;
    const didCopy = await copyText(locker.owner_tag);
    if (didCopy) {
      setCopiedTag(true);
      window.setTimeout(() => setCopiedTag(false), 1500);
      return;
    }
    onCopyFailed?.("Couldn't copy. Select the tag and press Ctrl+C.");
  };

  return (
    <article
      className={`surface-card locker-card flex flex-col p-5 ${
        isLive ? "" : "is-offline"
      }`}
    >
      <div className="locker-card-header">
        <h3>Locker {locker.id}</h3>
        <span className={`status-badge ${statusClass}`}>
          {isOpen ? (
            <Unlock size={14} aria-hidden="true" />
          ) : isOccupied ? (
            <UserRound size={14} aria-hidden="true" />
          ) : (
            <Check size={14} aria-hidden="true" />
          )}
          {status}
        </span>
      </div>

      <div className={`state-block ${stateClass}`}>
        <span className="state-icon">
          {isOpen || isOpening ? (
            <Unlock size={19} strokeWidth={1.7} aria-hidden="true" />
          ) : (
            <Lock size={19} strokeWidth={1.7} aria-hidden="true" />
          )}
        </span>
        <span className="state-copy">
          <strong>{isOpening && !isOpen ? "Opening…" : isOpen ? "Open" : "Locked"}</strong>
          <small>{stateCaption}</small>
        </span>
      </div>

      {isTimedOut && (
        <div className="timeout-notice" role="status">
          <AlertCircle size={16} aria-hidden="true" />
          <span>
            No confirmation from the locker board yet. Check it is powered and
            on Wi-Fi.
          </span>
          <button
            type="button"
            onClick={() => onDismissTimeout(locker.id)}
            aria-label="Dismiss notice"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="owner-row">
        {isOccupied ? (
          <>
            <strong className="owner-name">{locker.name || "Unknown"}</strong>
            <span className="tag-chip">
              <code>{locker.owner_tag}</code>
              <button
                type="button"
                className="tag-copy-button"
                onClick={handleCopyTag}
                aria-label={`Copy tag ${locker.owner_tag}`}
                title="Copy tag ID to clipboard"
              >
                {copiedTag ? (
                  <Check size={13} aria-hidden="true" />
                ) : (
                  <Copy size={13} aria-hidden="true" />
                )}
              </button>
            </span>
            <small className="owner-since">
              since {locker.assigned_at || "–"}
            </small>
          </>
        ) : (
          <span className="owner-empty">
            <UserRoundPlus size={16} aria-hidden="true" />
            No owner. Free to assign.
          </span>
        )}
      </div>

      <div className="locker-actions">
        <form onSubmit={handleAssignClick} className="assign-controls">
          <select
            value={selectedTagValue}
            onChange={(event) => setSelectedTag(event.target.value)}
            disabled={!isLive}
            className="control"
            aria-label={`Select user to assign to Locker ${locker.id}`}
          >
            <option value="">Assign to…</option>
            {users.map((user) => (
              <option key={user.tag} value={user.tag}>
                {user.name} ({user.tag})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!selectedTagValue || !isLive}
            className="button button-secondary"
          >
            <UserRound size={15} aria-hidden="true" />
            Assign
          </button>
        </form>
        <div className="locker-action-row">
          <button
            type="button"
            onClick={handleReleaseClick}
            disabled={!isOccupied || !isLive}
            className="button button-destructive-outline"
          >
            Release
          </button>
          <button
            type="button"
            onClick={handleOpenClick}
            disabled={isOpening || !isLive}
            className="button button-primary"
          >
            <Unlock size={15} aria-hidden="true" />
            {isOpening ? "Opening…" : "Open now"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        isDestructive={dialogState.isDestructive}
        confirmLabel="Continue"
        onConfirm={dialogState.confirmAction}
        onClose={() => setDialogState((previous) => ({ ...previous, isOpen: false }))}
      />
    </article>
  );
}

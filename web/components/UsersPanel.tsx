"use client";

import React, { useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import type { User } from "@/lib/types";
import { copyText } from "@/lib/copy-text";
import { AddUserForm } from "./AddUserForm";
import { ConfirmDialog } from "./ConfirmDialog";
import { SectionCard } from "./SectionCard";

interface UsersPanelProps {
  users: User[];
  onAddUser: (name: string, tag: string) => Promise<{ ok: boolean; message: string }>;
  onRemoveUser: (tag: string) => Promise<{ ok: boolean; message: string }>;
  prefillTag?: { tag: string; nonce: number } | null;
  nameInputRef?: React.RefObject<HTMLInputElement | null>;
  onCopyFailed?: (message: string) => void;
}

export function UsersPanel({
  users,
  onAddUser,
  onRemoveUser,
  prefillTag,
  nameInputRef,
  onCopyFailed,
}: UsersPanelProps) {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);

  const handleCopyTag = async (tag: string) => {
    const didCopy = await copyText(tag);
    if (didCopy) {
      setCopiedTag(tag);
      window.setTimeout(() => setCopiedTag(null), 1500);
      return;
    }
    setCopiedTag(null);
    onCopyFailed?.("Couldn't copy. Select the tag and press Ctrl+C.");
  };

  return (
    <>
      <SectionCard
        id="users"
        title="Users and registration"
        action={
          <span className="section-count">
            {users.length} {users.length === 1 ? "user" : "users"}
          </span>
        }
      >
        <div className="section-card-body users-layout">
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Tag ID</th>
                  <th scope="col">Assigned locker</th>
                  <th scope="col" className="actions-heading">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-table">
                      No registered users yet. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.tag}>
                      <td className="user-name-cell">{user.name}</td>
                      <td>
                        <span className="tag-chip">
                          <code>{user.tag}</code>
                          <button
                            type="button"
                            className="tag-copy-button"
                            onClick={() => handleCopyTag(user.tag)}
                            title="Copy tag ID to clipboard"
                            aria-label={`Copy tag ${user.tag}`}
                          >
                            {copiedTag === user.tag ? (
                              <Check size={13} aria-hidden="true" />
                            ) : (
                              <Copy size={13} aria-hidden="true" />
                            )}
                          </button>
                        </span>
                      </td>
                      <td>
                        {user.locker_id ? (
                          <span className="assigned-label">
                            Locker {user.locker_id}
                          </span>
                        ) : (
                          <span className="muted-dash">—</span>
                        )}
                      </td>
                      <td className="actions-cell">
                        <button
                          type="button"
                          onClick={() => setUserToRemove(user)}
                          className="button button-destructive-outline remove-button"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <AddUserForm
            onAddUser={onAddUser}
            prefillTag={prefillTag}
            nameInputRef={nameInputRef}
          />
        </div>
      </SectionCard>

      <ConfirmDialog
        isOpen={Boolean(userToRemove)}
        title={`Remove ${userToRemove?.name || "User"}`}
        message={
          userToRemove?.locker_id
            ? `Remove ${userToRemove.name}? Their assigned Locker ${userToRemove.locker_id} will be freed.`
            : `Remove ${userToRemove?.name || "this user"} from the system?`
        }
        isDestructive={true}
        confirmLabel="Remove user"
        onConfirm={() => {
          if (userToRemove) {
            onRemoveUser(userToRemove.tag);
          }
        }}
        onClose={() => setUserToRemove(null)}
      />
    </>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, UserPlus } from "lucide-react";
import { normalizeTag, validateTag } from "@/lib/tag";

interface AddUserFormProps {
  onAddUser: (name: string, tag: string) => Promise<{ ok: boolean; message: string }>;
  prefillTag?: { tag: string; nonce: number } | null;
  nameInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function AddUserForm({
  onAddUser,
  prefillTag,
  nameInputRef,
}: AddUserFormProps) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState(prefillTag?.tag || "");
  const [prevPrefill, setPrevPrefill] = useState(prefillTag);
  const [tagError, setTagError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (prefillTag !== prevPrefill) {
    setPrevPrefill(prefillTag);
    setTag(prefillTag?.tag || "");
  }

  useEffect(() => {
    if (prefillTag) {
      nameInputRef?.current?.focus();
    }
  }, [prefillTag, nameInputRef]);

  const normalizedPreview = normalizeTag(tag);

  const handleTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTag(value);
    if (value.trim()) {
      const validation = validateTag(value);
      setTagError(validation.valid ? null : validation.error || null);
    } else {
      setTagError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const validation = validateTag(tag);
    if (!validation.valid) {
      setTagError(validation.error || "Invalid tag format");
      return;
    }

    setIsSubmitting(true);
    const result = await onAddUser(trimmedName, tag);
    setIsSubmitting(false);

    if (result.ok) {
      setName("");
      setTag("");
      setTagError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-panel user-form">
      <h3>Add user</h3>

      <div className="form-field">
        <label htmlFor="user-name-input">Name</label>
        <input
          id="user-name-input"
          ref={nameInputRef}
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Albert"
          className="control"
        />
      </div>

      <div className="form-field">
        <label htmlFor="user-tag-input">RFID tag ID</label>
        <input
          id="user-tag-input"
          type="text"
          required
          value={tag}
          onChange={handleTagChange}
          placeholder="e.g. 03 1A B0 01"
          aria-invalid={Boolean(tagError)}
          aria-describedby={tagError ? "tag-error" : "tag-help"}
          className={`control tag-input ${tagError ? "control-error" : ""}`}
        />
        <span id="tag-help" className="field-help">
          Enter the hexadecimal ID printed by the reader.
        </span>
        {tagError && (
          <span id="tag-error" className="field-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            {tagError}
          </span>
        )}
      </div>

      {normalizedPreview && (
        <p className="normalized-preview">
          Normalized preview: <code>{normalizedPreview}</code>
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || Boolean(tagError)}
        className="button button-primary add-user-button"
      >
        <UserPlus size={15} aria-hidden="true" />
        {isSubmitting ? "Adding…" : "Add user"}
      </button>
    </form>
  );
}

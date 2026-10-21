/**
 * Normalizes an RFID Tag UID to the standard format matching the Flask backend:
 * e.g., "03:1a:b0:01" or "031ab001" -> "03 1A B0 01"
 */
export function normalizeTag(tag: string): string {
  const hexchars = (tag || "")
    .toUpperCase()
    .split("")
    .filter((c) => "0123456789ABCDEF".includes(c))
    .join("");
  const pairs: string[] = [];
  for (let i = 0; i < hexchars.length; i += 2) {
    pairs.push(hexchars.slice(i, i + 2));
  }
  return pairs.join(" ");
}

/**
 * Normalizes an existing tag from legacy data or from the browser UI.
 * Accepts hex digits separated by spaces, colons or hyphens.
 * Allows short tags that already exist in Flask, as long as they are
 * still hexadecimal and within the supported length range.
 */
export function normalizeExistingTag(rawTag: string): string | null {
  const tag = (rawTag ?? "").trim();
  if (!tag) return null;

  const stripped = tag.replace(/[\s:-]/g, "");
  if (!stripped) return null;
  if (!/^[0-9A-Fa-f]+$/.test(stripped)) return null;
  if (stripped.length < 1 || stripped.length > 40) return null;

  return normalizeTag(stripped);
}

/**
 * Validates an RFID Tag UID:
 * - Must not be empty
 * - Must only contain hex characters (ignoring separators : - space)
 * - Must have at least 8 hex digits (4 bytes minimum for RC522)
 * - Must have an even number of hex digits
 */
export function validateTag(tag: string): { valid: boolean; error?: string } {
  if (!tag || !tag.trim()) {
    return { valid: false, error: "Tag ID is required" };
  }

  // Remove common separators
  const stripped = tag.trim().replace(/[\s:-]/g, "");
  
  if (/[^0-9A-Fa-f]/.test(stripped)) {
    return {
      valid: false,
      error: "Tag ID must contain only hexadecimal digits (0-9, A-F)",
    };
  }

  if (stripped.length < 8) {
    return {
      valid: false,
      error: "Tag ID must contain at least 8 hex digits (4 bytes)",
    };
  }

  if (stripped.length % 2 !== 0) {
    return {
      valid: false,
      error: "Tag ID must contain an even number of hex digits (complete bytes)",
    };
  }

  return { valid: true };
}

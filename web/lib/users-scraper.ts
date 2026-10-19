import "server-only";
import * as cheerio from "cheerio";
import { normalizeTag } from "./tag";

export interface ScrapedUser {
  tag: string;
  name: string;
}

/**
 * Parses the users list from the legacy dashboard HTML.
 * Primary source: table tbody tr rows (name = td strong, tag = td code).
 * Fallback / sanity check: select[name="tag"] option elements.
 *
 * If the HTML structure is missing or unrecognizable, throws an Error("users_unreadable").
 */
export function parseUsersFromDashboardHtml(html: string): ScrapedUser[] {
  if (!html || typeof html !== "string") {
    throw new Error("users_unreadable: empty HTML payload");
  }

  const $ = cheerio.load(html);

  // Check whether the Users table or locker assign select exists in the document
  const table = $("table");
  const select = $('select[name="tag"]');

  if (table.length === 0 && select.length === 0) {
    throw new Error("users_unreadable: table and select elements not found");
  }

  const usersMap = new Map<string, string>();

  // Primary: parse from Users table
  const rows = $("table tbody tr");
  rows.each((_idx, el) => {
    const row = $(el);
    const nameEl = row.find("td strong");
    const tagEl = row.find("td code");

    if (nameEl.length > 0 && tagEl.length > 0) {
      const name = nameEl.text().trim();
      const rawTag = tagEl.text().trim();
      const tag = normalizeTag(rawTag);
      if (tag && name) {
        usersMap.set(tag, name);
      }
    }
  });

  // Fallback / sanity check: if table was empty, check select options
  if (usersMap.size === 0 && select.length > 0) {
    select.first().find("option").each((_idx, el) => {
      const opt = $(el);
      const val = opt.attr("value");
      if (val && val.trim()) {
        const rawTag = val.trim();
        const tag = normalizeTag(rawTag);
        const name = opt.text().trim();
        if (tag && name) {
          usersMap.set(tag, name);
        }
      }
    });
  }

  // If table exists but has 0 rows and select has 0 non-empty options,
  // that's a valid empty user list (not a parsing error).
  return Array.from(usersMap.entries()).map(([tag, name]) => ({
    tag,
    name,
  }));
}

/**
 * Fetches the legacy dashboard HTML from Flask and parses the users list.
 */
export async function fetchUsersFromBackend(
  backendUrl: string
): Promise<{ users?: ScrapedUser[]; error?: string }> {
  const url = `${backendUrl.replace(/\/$/, "")}/`;
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return { error: `HTTP ${res.status} from backend` };
    }

    const html = await res.text();
    const users = parseUsersFromDashboardHtml(html);
    return { users };
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.startsWith("users_unreadable")
    ) {
      return { error: "users_unreadable" };
    }
    return { error: "backend_unreachable" };
  }
}

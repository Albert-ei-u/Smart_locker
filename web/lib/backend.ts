import "server-only";
import { BffResult } from "./types";

export const BACKEND_FAILURE_MESSAGES = [
  "Enter both a name and a tag ID",
  "Choose a user first",
] as const;

export function getBackendUrl(): string {
  return process.env.BACKEND_URL || "http://127.0.0.1:5001";
}

/**
 * Classifies a message from Flask's 302 redirect /?msg=...
 * The only failure messages defined by the backend contract are:
 * - "Enter both a name and a tag ID"
 * - "Choose a user first"
 * Everything else is considered a success.
 */
export function classifyBackendMessage(msg: string): BffResult {
  const trimmed = (msg || "").trim();
  const isFailure = BACKEND_FAILURE_MESSAGES.includes(
    trimmed as (typeof BACKEND_FAILURE_MESSAGES)[number]
  );
  return {
    ok: !isFailure,
    message: trimmed || (isFailure ? "Operation failed" : "Success"),
  };
}

/**
 * Validates that a mutation request comes from the same origin to block CSRF.
 */
export function validateSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // If no origin is provided (e.g., standard same-origin or server-to-server), accept
    return true;
  }
  const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
  if (!host) {
    return false;
  }
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

/**
 * Validates Content-Type: application/json and same-origin policy on mutations.
 */
export function checkMutationRequest(
  request: Request
): { valid: boolean; status?: number; error?: string } {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      valid: false,
      status: 415,
      error: "Content-Type must be application/json",
    };
  }
  if (!validateSameOrigin(request)) {
    return {
      valid: false,
      status: 403,
      error: "Cross-origin request rejected",
    };
  }
  return { valid: true };
}

/**
 * Validates that an ID route parameter is a strictly positive integer.
 */
export function parseLockerId(idParam: string): number | null {
  if (!/^\d+$/.test(idParam)) {
    return null;
  }
  const id = parseInt(idParam, 10);
  return id > 0 ? id : null;
}

/**
 * Calls a Flask POST endpoint using application/x-www-form-urlencoded and manual redirect handling.
 */
export async function postToBackend(
  path: string,
  params: Record<string, string>
): Promise<BffResult> {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl.replace(/\/$/, "")}${path}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (response.status === 302) {
      const location = response.headers.get("location") || "";
      let msg = "";
      try {
        const dummyUrl = new URL(location, "http://localhost");
        msg = dummyUrl.searchParams.get("msg") || "";
      } catch {
        // Fallback for relative paths without full URL
        const match = location.match(/[?&]msg=([^&]+)/);
        if (match) {
          msg = decodeURIComponent(match[1].replace(/\+/g, " "));
        }
      }
      return classifyBackendMessage(msg);
    }

    return {
      ok: false,
      message: `Unexpected response from locker server (HTTP ${response.status})`,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      message: isTimeout
        ? "Locker server timed out"
        : "Cannot reach the locker server",
    };
  }
}

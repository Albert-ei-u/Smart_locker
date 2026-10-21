import { NextRequest, NextResponse } from "next/server";
import {
  checkMutationRequest,
  getBackendUrl,
  postToBackend,
} from "@/lib/backend";
import { normalizeTag, validateTag } from "@/lib/tag";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${getBackendUrl().replace(/\/$/, "")}/api/users`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Cannot reach the locker server", users: [] },
        { status: 502 }
      );
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(
      { error: "Cannot reach the locker server", users: [] },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const check = checkMutationRequest(request);
  if (!check.valid) {
    return NextResponse.json(
      { ok: false, message: check.error },
      { status: check.status }
    );
  }

  let body: { name?: unknown; tag?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  const rawTag = typeof body.tag === "string" ? body.tag.trim() : "";

  if (!rawName || rawName.length > 60) {
    return NextResponse.json(
      {
        ok: false,
        message: "Name must be between 1 and 60 characters",
      },
      { status: 400 }
    );
  }

  const tagCheck = validateTag(rawTag);
  if (!tagCheck.valid) {
    return NextResponse.json(
      {
        ok: false,
        message: tagCheck.error || "Invalid tag ID",
      },
      { status: 400 }
    );
  }

  const normalizedTag = normalizeTag(rawTag);
  const result = await postToBackend("/users/add", {
    name: rawName,
    tag: normalizedTag,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { checkMutationRequest, postToBackend } from "@/lib/backend";
import { normalizeExistingTag } from "@/lib/tag";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const check = checkMutationRequest(request);
  if (!check.valid) {
    return NextResponse.json(
      { ok: false, message: check.error },
      { status: check.status }
    );
  }

  let body: { tag?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const rawTag = typeof body.tag === "string" ? body.tag.trim() : "";
  const normalizedTag = normalizeExistingTag(rawTag);
  if (!normalizedTag) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid tag ID",
      },
      { status: 400 }
    );
  }
  const result = await postToBackend("/users/delete", { tag: normalizedTag });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

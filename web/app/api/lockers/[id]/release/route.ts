import { NextRequest, NextResponse } from "next/server";
import {
  checkMutationRequest,
  parseLockerId,
  postToBackend,
} from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const check = checkMutationRequest(request);
  if (!check.valid) {
    return NextResponse.json(
      { ok: false, message: check.error },
      { status: check.status }
    );
  }

  const { id } = await context.params;
  const lockerId = parseLockerId(id);
  if (lockerId === null) {
    return NextResponse.json(
      { ok: false, message: "Invalid locker ID" },
      { status: 400 }
    );
  }

  const result = await postToBackend(`/lockers/${lockerId}/release`, {});
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

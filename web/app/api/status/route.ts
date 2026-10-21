import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { StatusResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const backendUrl = getBackendUrl();
  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/status`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Cannot reach the locker server" },
        { status: 502 }
      );
    }

    const data: StatusResponse = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Cannot reach the locker server" },
      { status: 502 }
    );
  }
}

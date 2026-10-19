import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as removeUser } from "@/app/api/users/remove/route";
import { POST as assignLocker } from "@/app/api/lockers/[id]/assign/route";
import { POST as addUser } from "@/app/api/users/route";

const json = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const flask302 = (msg: string) =>
  new Response(null, { status: 302, headers: { location: `/?msg=${msg}` } });

afterEach(() => vi.restoreAllMocks());

describe("BFF must keep working for users that already exist in Flask", () => {
  it("removes a legacy user whose tag has fewer than 8 hex digits", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(flask302("User+removed"));
    const res = await removeUser(json("http://localhost/api/users/remove", { tag: "AB CD" }));
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("assigns a locker to a legacy user whose tag has fewer than 8 hex digits", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(flask302("Locker+3+assigned"));
    const res = await assignLocker(json("http://localhost/api/lockers/3/assign", { tag: "AB CD" }), {
      params: Promise.resolve({ id: "3" }),
    });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("still rejects tags that are not hexadecimal at all", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const res = await removeUser(json("http://localhost/api/users/remove", { tag: "not-a-tag!" }));
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps the STRICT format rule (>= 8 hex digits, even count) when ADDING a user", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const res = await addUser(json("http://localhost/api/users", { name: "Short", tag: "AB CD" }));
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
});

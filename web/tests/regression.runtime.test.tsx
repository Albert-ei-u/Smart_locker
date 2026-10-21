// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = false;

const lockers = [
  { id: 1, owner_tag: "03 1A B0 01", assigned_at: "2026-10-13 10:00:00", door: "locked" as const, door_changed: null, door_by: null, name: "Blue fob" },
  { id: 2, owner_tag: null, assigned_at: null, door: "locked" as const, door_changed: null, door_by: null, name: null },
];
const logs = [{ id: 1, time: "2026-10-13 10:00:00", tag: "AA BB CC DD", locker_id: null, result: "DENIED", detail: "unknown tag", name: null }];
const users = [{ tag: "03 1A B0 01", name: "Blue fob" }, { tag: "FE 23 9C 04", name: "Second tag" }];
const consoleProblems: string[] = [];

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation((...a) => { consoleProblems.push(a.map(String).join(" ").slice(0, 300)); });
  vi.spyOn(console, "warn").mockImplementation((...a) => { consoleProblems.push("WARN " + a.map(String).join(" ").slice(0, 300)); });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => cleanup());

/** Mocks the BFF. `openOk=false` makes POST /api/lockers/N/open fail like an unreachable Flask. */
function mockBff(openOk: boolean) {
  global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (init?.method === "POST") {
      return openOk
        ? new Response(JSON.stringify({ ok: true, message: "Opening locker 1..." }), { status: 200 })
        : new Response(JSON.stringify({ ok: false, message: "Cannot reach the locker server" }), { status: 502 });
    }
    if (u.includes("/api/status")) return new Response(JSON.stringify({ lockers, logs }));
    if (u.includes("/api/users")) return new Response(JSON.stringify({ users }));
    return new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
}

const mountDashboard = () =>
  render(<Dashboard initialStatus={{ lockers, logs }} initialUsers={users} />);

async function pressOpenNowAndConfirm() {
  fireEvent.click(screen.getAllByRole("button", { name: /Open now/ })[0]);
  fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
}

describe("dashboard runtime regressions", () => {
  it("renders and polls without React errors or warnings", async () => {
    consoleProblems.length = 0;
    mockBff(true);
    mountDashboard();
    await new Promise((r) => setTimeout(r, 2500));
    expect(consoleProblems).toEqual([]);
  }, 15000);

  it("a FAILED Open-now request does not leave the card stuck on 'Opening…'", async () => {
    mockBff(false);
    mountDashboard();
    await pressOpenNowAndConfirm();
    await new Promise((r) => setTimeout(r, 1200));
    expect(screen.queryAllByRole("button", { name: /Opening…/ })).toHaveLength(0);
    const btn = screen.getAllByRole("button", { name: /Open now/ })[0] as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  }, 15000);

  it("after the ~8 s no-confirmation timeout, the Open button is usable again", async () => {
    mockBff(true);
    mountDashboard();
    await pressOpenNowAndConfirm();
    await waitFor(
      () => expect(screen.queryByText(/No confirmation from the locker board/)).not.toBeNull(),
      { timeout: 12000 }
    );
    const btn = screen.getAllByRole("button", { name: /Opening…|Open now/ })[0] as HTMLButtonElement;
    expect(btn.textContent).toMatch(/Open now/);
    expect(btn.disabled).toBe(false);
  }, 20000);

  it("'Register this tag' pre-fills the form every time, even for the same tag", async () => {
    mockBff(true);
    mountDashboard();
    const reg = screen.getByRole("button", { name: /Register this tag/ });
    const tagInput = document.getElementById("user-tag-input") as HTMLInputElement;
    fireEvent.click(reg);
    await waitFor(() => expect(tagInput.value).toBe("AA BB CC DD"));
    fireEvent.change(tagInput, { target: { value: "" } });
    fireEvent.click(reg);
    await waitFor(() => expect(tagInput.value).toBe("AA BB CC DD"));
  }, 15000);
});

import { describe, it, expect } from "vitest";
import {
  BACKEND_FAILURE_MESSAGES,
  classifyBackendMessage,
} from "../lib/backend";

describe("Backend Message Classification", () => {
  it("verifies the fixed list of backend failure messages", () => {
    expect(BACKEND_FAILURE_MESSAGES).toEqual([
      "Enter both a name and a tag ID",
      "Choose a user first",
    ]);
  });

  it("classifies 'Enter both a name and a tag ID' as failure", () => {
    const result = classifyBackendMessage("Enter both a name and a tag ID");
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Enter both a name and a tag ID");
  });

  it("classifies 'Choose a user first' as failure", () => {
    const result = classifyBackendMessage("Choose a user first");
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Choose a user first");
  });

  it("classifies success messages correctly", () => {
    expect(classifyBackendMessage("Added Albert")).toEqual({
      ok: true,
      message: "Added Albert",
    });
    expect(classifyBackendMessage("User removed")).toEqual({
      ok: true,
      message: "User removed",
    });
    expect(classifyBackendMessage("Locker 1 assigned")).toEqual({
      ok: true,
      message: "Locker 1 assigned",
    });
    expect(classifyBackendMessage("Locker 1 is now free")).toEqual({
      ok: true,
      message: "Locker 1 is now free",
    });
    expect(classifyBackendMessage("Opening locker 1...")).toEqual({
      ok: true,
      message: "Opening locker 1...",
    });
  });
});

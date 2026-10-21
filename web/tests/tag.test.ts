import { describe, it, expect } from "vitest";
import { normalizeTag, validateTag } from "../lib/tag";

describe("RFID Tag Normalization", () => {
  it("normalizes colon-delimited lowercase tag", () => {
    expect(normalizeTag("03:1a:b0:01")).toBe("03 1A B0 01");
  });

  it("normalizes continuous hex string", () => {
    expect(normalizeTag("031ab001")).toBe("03 1A B0 01");
  });

  it("normalizes hyphen-delimited tag", () => {
    expect(normalizeTag("fe-23-9c-04")).toBe("FE 23 9C 04");
  });

  it("normalizes already spaced uppercase tag with extra whitespace", () => {
    expect(normalizeTag("   03 1A B0 01   ")).toBe("03 1A B0 01");
  });

  it("handles 7-byte tag (14 hex digits)", () => {
    expect(normalizeTag("04:12:34:56:78:9a:bc")).toBe("04 12 34 56 78 9A BC");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeTag("")).toBe("");
  });
});

describe("RFID Tag Validation", () => {
  it("accepts valid 4-byte (8 hex chars) tags", () => {
    expect(validateTag("03 1A B0 01").valid).toBe(true);
    expect(validateTag("03:1a:b0:01").valid).toBe(true);
    expect(validateTag("031ab001").valid).toBe(true);
  });

  it("accepts valid 7-byte and 10-byte tags", () => {
    expect(validateTag("04:12:34:56:78:9A:BC").valid).toBe(true);
    expect(validateTag("04 12 34 56 78 9A BC DE F0").valid).toBe(true);
  });

  it("rejects empty or whitespace-only tags", () => {
    expect(validateTag("").valid).toBe(false);
    expect(validateTag("   ").valid).toBe(false);
  });

  it("rejects tags containing non-hexadecimal characters", () => {
    const res = validateTag("03 1A G0 01");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("hexadecimal");
  });

  it("rejects tags shorter than 8 hex digits (minimum 4 bytes)", () => {
    const res = validateTag("03 1A B0");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("at least 8 hex digits");
  });

  it("rejects tags with an odd number of hex digits", () => {
    const res = validateTag("03 1A B0 01 2");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("even number");
  });
});

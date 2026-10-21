import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseUsersFromDashboardHtml } from "../lib/users-scraper";

describe("Users Scraper", () => {
  it("parses users from fixture HTML and properly decodes HTML entities", () => {
    const fixturePath = path.resolve(
      __dirname,
      "fixtures/legacy_dashboard.html"
    );
    const html = fs.readFileSync(fixturePath, "utf-8");

    const users = parseUsersFromDashboardHtml(html);
    expect(users).toHaveLength(3);

    expect(users[0]).toEqual({
      name: "Blue fob",
      tag: "03 1A B0 01",
    });

    expect(users[1]).toEqual({
      name: "Second tag",
      tag: "FE 23 9C 04",
    });

    // Validates that &lt;b&gt;x&lt;/b&gt; &amp; &#34;q&#34; &#39;z&#39; is decoded to <b>x</b> & "q" 'z'
    expect(users[2]).toEqual({
      name: `<b>x</b> & "q" 'z'`,
      tag: "AA BB CC DD",
    });
  });

  it("falls back to select options if the table is missing rows", () => {
    const html = `
      <html>
        <body>
          <select name="tag">
            <option value="">Assign to...</option>
            <option value="03 1a b0 01">Blue fob</option>
          </select>
        </body>
      </html>
    `;
    const users = parseUsersFromDashboardHtml(html);
    expect(users).toEqual([
      {
        name: "Blue fob",
        tag: "03 1A B0 01",
      },
    ]);
  });

  it("throws users_unreadable when neither table nor select exists", () => {
    const html = `<html><body><div>No users here</div></body></html>`;
    expect(() => parseUsersFromDashboardHtml(html)).toThrow(
      "users_unreadable"
    );
  });
});

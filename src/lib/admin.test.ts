import { afterEach, describe, expect, it } from "vitest";
import { getAdminEmail, isAdminUser } from "@/lib/admin";

describe("admin access", () => {
  const original = process.env.ADMIN_EMAIL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ADMIN_EMAIL;
    } else {
      process.env.ADMIN_EMAIL = original;
    }
  });

  it("returns false when ADMIN_EMAIL is unset", () => {
    delete process.env.ADMIN_EMAIL;
    expect(getAdminEmail()).toBeNull();
    expect(isAdminUser({ email: "admin@example.com" })).toBe(false);
  });

  it("matches admin email case-insensitively", () => {
    process.env.ADMIN_EMAIL = "Admin@Example.com";
    expect(isAdminUser({ email: "admin@example.com" })).toBe(true);
    expect(isAdminUser({ email: "other@example.com" })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { signupDestination } from "./signup-destination";

describe("immediate signup navigation", () => {
  it("takes a signed-in signup straight to the dashboard", () => {
    expect(signupDestination({ user: { id: "new-user" } })).toBe("/dashboard");
  });
  it("does not grant access without a session", () => {
    expect(signupDestination(null)).toBeNull();
  });
  it("preserves an existing delegated consent destination", () => {
    expect(signupDestination({ user: { id: "new-user" } }, "/.lovable/oauth/consent?authorization_id=abc")).toBe("/.lovable/oauth/consent?authorization_id=abc");
  });
});
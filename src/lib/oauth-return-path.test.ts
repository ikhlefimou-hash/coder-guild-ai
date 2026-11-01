import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "./oauth-return-path";

describe("OAuth return path", () => {
  it("preserves consent parameters and fragments", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc#details")).toBe("/.lovable/oauth/consent?authorization_id=abc#details");
  });
  it.each(["//evil.test", "/\\evil.test", "https://evil.test", "/\n/evil.test", undefined])("rejects external or unsafe paths %s", (path) => {
    expect(oauthReturnPath(path)).toBe("/");
  });
});
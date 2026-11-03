import { describe, expect, it } from "vitest";
import { supportsManagedOAuth } from "./oauth-host";

describe("managed OAuth host", () => {
  it.each(["localhost", "127.0.0.1", "::1"])("is unavailable on local host %s", (h) => {
    expect(supportsManagedOAuth(h)).toBe(false);
  });
  it.each(["coder-guild-ai.lovable.app", "id-preview--x.lovable.app", "devhub.example.com"])("is available on %s", (h) => {
    expect(supportsManagedOAuth(h)).toBe(true);
  });
});

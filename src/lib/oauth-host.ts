// Managed Google sign-in goes through /~oauth/initiate, which only Lovable hosting
// (preview, published, custom domains) serves. A local dev server has no such route.
export function supportsManagedOAuth(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return !(h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" || h.endsWith(".localhost"));
}

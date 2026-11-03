// Signup only grants access when Auth actually returns a signed-in session.
export function signupDestination(session: unknown, next = "/dashboard"): string | null {
  return session ? next : null;
}
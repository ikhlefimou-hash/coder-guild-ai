# Architecture rules
- Express the application's appearance through semantic HSL tokens and shared UI components so every module follows the same theme.
- Manage appearance with next-themes using the existing `theme` storage key so saved choices and system appearance apply across all pages without reloads.
- Keep visual redesigns separate from authentication, encryption, database access, and permission logic so existing functionality is preserved.
- Author remote agent tools only in src/lib/mcp using the SDK plugin and caller-scoped OAuth clients; generated edge transport is SDK-owned and permissions remain in existing RLS.
- Keep browser tools in their visible page components with the shared telemetry wrapper, so tools follow screen lifecycle and never change normal UI behavior.
- Validate local auth return paths once at the login boundary and preserve them through every login method, so delegated consent survives sign-in and registration safely.- Run all learner code only in browser Web Workers (Pyodide/JS) and reveal model solutions only through a server function that checks the caller already passed; the server never executes untrusted code.

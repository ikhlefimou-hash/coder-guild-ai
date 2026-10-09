# Architecture rules
- Express the application's appearance through semantic HSL tokens and shared UI components so every module follows the same theme.
- Manage appearance with next-themes using the existing `theme` storage key so saved choices and system appearance apply across all pages without reloads.
- Keep visual redesigns separate from authentication, encryption, database access, and permission logic so existing functionality is preserved.
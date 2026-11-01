import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Read my DevHub profile",
  description: "Read the caller's own display profile and skills, excluding encryption keys and verification notes.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) return { content: [{ type: "text", text: "Sign in to read your profile." }], isError: true };
    const client = await supabaseForUser(ctx);
    const { data, error } = await client.from("profiles").select("username,full_name,bio,skills,is_verified").eq("id", userId).maybeSingle().abortSignal(ctx.signal);
    if (error) return { content: [{ type: "text", text: "Unable to load your profile." }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No profile found." }] };
    const profile = { username: String(data.username), full_name: data.full_name == null ? null : String(data.full_name), bio: data.bio == null ? null : String(data.bio), skills: Array.isArray(data.skills) ? data.skills.map(String) : [], is_verified: Boolean(data.is_verified) };
    return { content: [{ type: "text", text: JSON.stringify(profile) }], structuredContent: { profile } };
  },
});
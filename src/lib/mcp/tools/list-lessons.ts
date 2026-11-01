import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_published_lessons",
  title: "Browse published lessons",
  description: "List published DevHub lessons visible to the signed-in user, without private drafts or course video links.",
  inputSchema: { limit: z.number().int().min(1).max(50).default(20).describe("Maximum number of lessons to return (1–50).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const client = await supabaseForUser(ctx);
    const { data, error } = await client.from("lessons").select("id,title,description,category,price,type").eq("is_published", true).order("created_at", { ascending: false }).limit(limit).abortSignal(ctx.signal);
    if (error) return { content: [{ type: "text", text: "Unable to load lessons." }], isError: true };
    const lessons = (data ?? []).map((row) => ({ id: String(row.id), title: String(row.title), description: String(row.description), category: row.category == null ? null : String(row.category), price: Number(row.price), type: String(row.type) }));
    return { content: [{ type: "text", text: JSON.stringify(lessons) }], structuredContent: { lessons } };
  },
});
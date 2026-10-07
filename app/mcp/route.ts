import { dispatchReminders, pushConfig } from "@/lib/push-server";
export const dynamic = "force-dynamic";
// Sites strips spoofed identity headers at its hosting boundary. This service tool
// can only dispatch already-due reminders; callers cannot supply recipients/content
// or read profiles, subscriptions, payments, or registrations.
export async function POST(req: Request) {
  if (!req.headers.get("oai-authenticated-user-id"))
    return new Response("Authenticated Sites connection required", {
      status: 401,
    });
  if (Number(req.headers.get("content-length") || 0) > 10000)
    return new Response("Too large", { status: 413 });
  let b: any;
  try {
    const raw = await req.text();
    if (raw.length > 10000) throw new Error();
    b = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const reply = (result: unknown) =>
    Response.json({ jsonrpc: "2.0", id: b.id, result });
  if (b.method === "notifications/initialized")
    return new Response(null, { status: 202 });
  if (b.method === "initialize")
    return reply({
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "clubos-reminders", version: "1.0.0" },
    });
  if (b.method === "tools/list")
    return reply({
      tools: [
        {
          name: "reminder_status",
          description:
            "Read whether device push and automatic contest reminder delivery are configured. Contains no student data.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
        },
        {
          name: "dispatch_due_contest_reminders",
          description:
            "Send only already-due 1-day and 1-hour contest reminders to opted-in devices of confirmed participants. Deduplicated on the server; no arbitrary recipient or content is accepted. Repeat if more=true.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
          },
        },
      ],
    });
  if (b.method === "tools/call") {
    if (Object.keys(b.params?.arguments || {}).length)
      return reply({
        isError: true,
        content: [{ type: "text", text: "This tool takes no arguments." }],
      });
    try {
      const result =
        b.params?.name === "reminder_status"
          ? {
              ready: pushConfig().ready,
              scheduled: pushConfig().remindersEnabled,
            }
          : b.params?.name === "dispatch_due_contest_reminders"
            ? await dispatchReminders()
            : null;
      if (!result) throw new Error("Unknown tool");
      return reply({
        content: [{ type: "text", text: JSON.stringify(result) }],
      });
    } catch {
      return reply({
        isError: true,
        content: [
          {
            type: "text",
            text: "Reminder delivery failed. Retry in five minutes and inspect the site's setup if it persists.",
          },
        ],
      });
    }
  }
  return Response.json({
    jsonrpc: "2.0",
    id: b.id,
    error: { code: -32601, message: "Method not found" },
  });
}

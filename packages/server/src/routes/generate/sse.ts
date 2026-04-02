import type { FastifyReply } from "fastify";

type SsePayload = Record<string, unknown>;

export function startSseReply(reply: FastifyReply, extraHeaders: Record<string, string> = {}) {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Connection: "keep-alive",
    ...extraHeaders,
  });
}

export function sendSseEvent(reply: FastifyReply, payload: SsePayload) {
  reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function trySendSseEvent(reply: FastifyReply, payload: SsePayload) {
  try {
    sendSseEvent(reply, payload);
  } catch {
    // Ignore writes after the client disconnects.
  }
}

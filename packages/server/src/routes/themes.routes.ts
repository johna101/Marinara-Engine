// ──────────────────────────────────────────────
// Routes: Synced Custom Themes
// ──────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import { createThemeSchema, setActiveThemeSchema, updateThemeSchema } from "@marinara-engine/shared";
import { createThemesStorage } from "../services/storage/themes.storage.js";

export async function themesRoutes(app: FastifyInstance) {
  const storage = createThemesStorage(app.db);

  app.get("/", async () => {
    return storage.list();
  });

  app.post("/", async (req) => {
    const input = createThemeSchema.parse(req.body);
    return storage.create(input);
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const data = updateThemeSchema.parse(req.body);
    const existing = await storage.getById(req.params.id);
    if (!existing) return reply.status(404).send({ error: "Theme not found" });
    return storage.update(req.params.id, data);
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const existing = await storage.getById(req.params.id);
    if (!existing) return reply.status(404).send({ error: "Theme not found" });
    await storage.remove(req.params.id);
    return reply.status(204).send();
  });

  app.put("/active", async (req, reply) => {
    const input = setActiveThemeSchema.parse(req.body);
    if (input.id !== null) {
      const existing = await storage.getById(input.id);
      if (!existing) return reply.status(404).send({ error: "Theme not found" });
    }
    return storage.setActive(input.id);
  });
}

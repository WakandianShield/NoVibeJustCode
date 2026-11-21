import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { checkConfig, config } from "./config/index.js";
import { q } from "./config/db.js";
import { csrf, errors, wrap } from "./middleware/index.mjs";
import { attachSockets } from "./socket.mjs";
import { router as accounts } from "./modules/cuentas/router.mjs";
import { router as learning } from "./modules/aprendizaje/router.mjs";
import { router as community } from "./modules/comunidad/router.mjs";
import { router as messages } from "./modules/mensajes/router.mjs";
import { router as projects } from "./modules/proyectos/router.mjs";
import { router as subscriptions } from "./modules/suscripciones/router.mjs";
import { router as privacy } from "./modules/privacidad/router.mjs";

export const app = express();

app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
  }),
);
app.use(
  cors({
    origin: config.origin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "12mb" }));
app.use(csrf);

app.get(
  "/api/salud",
  wrap(async (_request, response) => {
    await q("SELECT 1");
    response.json({ ok: true, plataforma: "NoVibeJustCode" });
  }),
);

app.use(
  "/uploads",
  express.static(config.uploadDir, {
    dotfiles: "deny",
    maxAge: "7d",
    fallthrough: false,
  }),
);

app.use(
  "/api",
  accounts,
  learning,
  community,
  messages,
  projects,
  subscriptions,
  privacy,
);
app.use("/api", (_request, response) =>
  response.status(404).json({ error: "Ruta no encontrada." }),
);
const frontendDir = fileURLToPath(new URL("../../frontend/dist/web/browser/", import.meta.url));
if (existsSync(join(frontendDir, "index.html"))) {
  app.use(express.static(frontendDir));
  app.get("/{*path}", (_request, response) => response.sendFile(join(frontendDir, "index.html")));
}
app.use(errors);

checkConfig();

const server = app.listen(config.port, () => {
  console.log(`Servidor ejecutándose en puerto ${config.port}`);
});

attachSockets(server);

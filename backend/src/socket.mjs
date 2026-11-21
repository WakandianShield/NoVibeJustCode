import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import { accounts } from "./modules/cuentas/service.mjs";
import { messages } from "./modules/mensajes/service.mjs";
import { config } from "./config/index.js";
export function attachSockets(server) {
  const io = new Server(server, {
    cors: { origin: config.origin, credentials: true },
    maxHttpBufferSize: 20000,
    allowRequest: (req, done) =>
      done(null, !req.headers.origin || req.headers.origin === config.origin),
  });
  io.use(async (socket, next) => {
    try {
      const cookies = Object.fromEntries(
        (socket.handshake.headers.cookie || "")
          .split(";")
          .filter(Boolean)
          .map((s) => {
            const i = s.indexOf("=");
            return [s.slice(0, i).trim(), decodeURIComponent(s.slice(i + 1))];
          }),
      );
      socket.data.token = cookies.nvjc;
      socket.data.user = await accounts.authenticate(cookies.nvjc);
      next();
    } catch {
      next(new Error("Sesión inválida."));
    }
  });
  const limits = new Map();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of limits) if (now - v.start > 60000) limits.delete(k);
  }, 60000);
  cleanup.unref();
  io.on("connection", (socket) => {
    const user = socket.data.user;
    socket.join("usuario:" + user.id_usuario);
    const handler = (event, fn) =>
      socket.on(event, async (body, ack = () => {}) => {
        if (typeof ack !== "function") ack = () => {};
        try {
          const fresh = await accounts.authenticate(socket.data.token);
          const id = fresh.id_usuario,
            now = Date.now();
          let bucket = limits.get(id);
          if (!bucket || now - bucket.start > 60000) {
            bucket = { start: now, count: 0 };
            limits.set(id, bucket);
          }
          if (++bucket.count > 60)
            throw Error("Límite de 60 mensajes por minuto.");
          const result = await fn(fresh, body);
          for (const uid of result.participantes)
            io.to("usuario:" + uid).emit(
              event === "mensaje:enviar"
                ? "mensaje:confirmado"
                : "mensaje:leido",
              result,
            );
          ack({ ok: true, data: result });
        } catch (e) {
          ack({
            ok: false,
            error: e.status
              ? e.message
              : "No se pudo enviar el mensaje. Revisa tu sesión y conexión.",
          });
        }
      });
    handler("mensaje:enviar", (u, b) => messages.send(u, b));
    handler("mensaje:leer", (u, b) => messages.read(u, Number(b.id_amistad)));
  });
  return io;
}

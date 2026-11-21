import rateLimit from "express-rate-limit";
import { accounts } from "../modules/cuentas/service.mjs";
import { config } from "../config/index.js";
import { assert } from "../domain.mjs";
export const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
export const auth = wrap(async (req, res, next) => {
  req.user = await accounts.authenticate(req.cookies.nvjc);
  next();
});
export const optionalAuth = wrap(async (req, res, next) => {
  if (req.cookies.nvjc)
    try {
      req.user = await accounts.authenticate(req.cookies.nvjc);
    } catch {}
  next();
});
export function csrf(req, res, next) {
  if (
    ["GET", "HEAD", "OPTIONS"].includes(req.method) ||
    req.path === "/api/notificaciones/paypal"
  )
    return next();
  try {
    assert(
      req.get("X-Requested-With") === "NoVibeJustCode",
      403,
      "Solicitud no autorizada.",
    );
    assert(
      !req.get("Origin") || req.get("Origin") === config.origin,
      403,
      "Origen no permitido.",
    );
    next();
  } catch (e) {
    next(e);
  }
}
export const accessLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera unos minutos." },
});
export const messageLimit = rateLimit({
  windowMs: 60000,
  limit: 60,
  keyGenerator: (req) => String(req.user.id_usuario),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Límite de 60 mensajes por minuto." },
});
export function errors(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.name === "ZodError")
    return res.status(422).json({
      error: "Revisa los campos indicados.",
      campos: err.issues.map((x) => ({
        campo: x.path.join("."),
        mensaje: x.message,
      })),
    });
  if (err.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({ error: "Ese correo, usuario o registro ya existe." });
  if (err.code === "LIMIT_FILE_SIZE")
    return res
      .status(422)
      .json({ error: "La imagen excede el tamaño permitido." });
  res.status(err.status || 500).json({
    error: err.status
      ? err.message
      : "Ocurrió un error interno. Vuelve a intentarlo.",
  });
  if (!err.status) console.error(err.code || err.name || "Error interno");
}

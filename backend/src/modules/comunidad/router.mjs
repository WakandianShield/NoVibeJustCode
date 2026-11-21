import { Router } from "express";
import { idSchema } from "../../domain.mjs";
import { controller as c } from "./controller.mjs";
import {
  auth,
  optionalAuth,
  messageLimit,
  wrap,
} from "../../middleware/index.mjs";
export const router = Router();
router.param("id", (req, res, next, value) => {
  if (req.path.startsWith("/suscripciones/")) return next();
  try {
    idSchema.parse(value);
    next();
  } catch (e) {
    next(e);
  }
});
router.get("/amistades", auth, wrap(c.list));
router.post("/amistades", auth, wrap(c.request));
for (const accion of [
  "aceptar",
  "rechazar",
  "cancelar",
  "eliminar",
  "bloquear",
  "desbloquear",
])
  router.post("/amistades/:id/" + accion, auth, (req, res, next) => {
    req.params.accion = accion;
    return wrap(c.action)(req, res, next);
  });

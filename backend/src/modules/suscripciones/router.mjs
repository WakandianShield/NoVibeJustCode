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
router.get("/configuracion/paypal", wrap(c.config));
router.get("/mi/suscripcion", auth, wrap(c.mine));
router.post("/suscripciones", auth, wrap(c.create));
router.post("/suscripciones/:id/confirmar", auth, wrap(c.sync));
router.post("/mi/suscripcion/cancelar", auth, wrap(c.cancel));
router.post("/notificaciones/paypal", wrap(c.webhook));

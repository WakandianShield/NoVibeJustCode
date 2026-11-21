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
router.get("/amistades/:id/mensajes", auth, wrap(c.history));
router.post("/mensajes", auth, messageLimit, wrap(c.send));
router.post("/amistades/:id/lectura", auth, wrap(c.read));

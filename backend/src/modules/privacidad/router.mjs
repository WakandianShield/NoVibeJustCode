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
router.post("/mi/datos/exportacion", auth, wrap(c.export));
router.delete("/mi/cuenta", auth, wrap(c.erase));

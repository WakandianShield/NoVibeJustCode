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
router.get("/cursos", wrap(c.courses));
router.get("/cursos/:id/ruta", optionalAuth, wrap(c.route));
router.get("/secciones/:id", auth, wrap(c.section));
router.get("/lecciones/:id", auth, wrap(c.lesson));
router.post("/lecciones/:id/lectura", auth, wrap(c.read));
router.post("/evaluaciones", auth, wrap(c.evaluate));
router.post("/ejercicios/:id/ejecutar", auth, wrap(c.run));
router.get("/evaluaciones/:id", auth, wrap(c.attempt));
router.get("/mi/progreso", auth, wrap(c.progress));
router.get("/mi/insignias", auth, wrap(c.badges));

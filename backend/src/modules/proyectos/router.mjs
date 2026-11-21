import { Router } from "express";
import { idSchema } from "../../domain.mjs";
import { projectController as c } from "./controller.mjs";
import { auth, wrap } from "../../middleware/index.mjs";
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
router.use("/proyectos", auth);
router.get("/proyectos", wrap(c.list));
router.post("/proyectos", wrap(c.create));
router.get("/proyectos/:id", wrap(c.get));
router.patch("/proyectos/:id", wrap(c.save));
router.post("/proyectos/:id/finalizar", wrap(c.finalize));
router.get("/proyectos/:id/validacion", wrap(c.get));
router.get("/proyectos/:id/zip", wrap(c.zip));

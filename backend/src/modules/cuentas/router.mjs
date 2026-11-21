import { Router } from "express";
import { idSchema } from "../../domain.mjs";
import multer from "multer";
import { accountController as c } from "./controller.mjs";
import { auth, wrap, accessLimit } from "../../middleware/index.mjs";
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
router.post("/cuentas", accessLimit, wrap(c.register));
router.post("/acceso", accessLimit, wrap(c.login));
router.delete("/acceso/actual", auth, wrap(c.logout));
router.get("/mi/perfil", auth, wrap(c.me));
router.patch("/mi/perfil", auth, wrap(c.update));
router.post(
  "/mi/perfil/:tipo",
  auth,
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single("imagen"),
  wrap(c.image),
);
router.get("/perfiles", wrap(c.search));
router.get("/perfiles/:usuario", wrap(c.profile));

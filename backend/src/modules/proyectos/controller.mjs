import { projects } from "./service.mjs";
import { parseJson } from "../../config/db.js";
import { cleanFiles } from "../../domain.mjs";
import archiver from "archiver";
export const projectController = {
  list: async (req, res) => res.json(await projects.list(req.user)),
  get: async (req, res) =>
    res.json(await projects.get(req.user, Number(req.params.id))),
  create: async (req, res) =>
    res.status(201).json(await projects.create(req.user, req.body)),
  save: async (req, res) =>
    res.json(await projects.save(req.user, Number(req.params.id), req.body)),
  finalize: async (req, res) =>
    res.json(await projects.finalize(req.user, Number(req.params.id))),
  zip: async (req, res, next) => {
    const p = await projects.owned(req.user, Number(req.params.id));
    const files = cleanFiles(
      parseJson(
        req.query.version === "final"
          ? p.archivos_entregados
          : p.archivos_borrador,
      ),
    );
    res.attachment("NoVibeJustCode-proyecto-" + p.id_proyecto + ".zip");
    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", next);
    archive.pipe(res);
    for (const [name, text] of Object.entries(files))
      archive.append(text, { name });
    if (!files["README.md"])
      archive.append(
        "# " +
          p.titulo +
          "\n\nProyecto de " +
          p.tecnologia +
          ". Consulta el curso para las instrucciones de ejecución.\n",
        { name: "README.md" },
      );
    await archive.finalize();
  },
};

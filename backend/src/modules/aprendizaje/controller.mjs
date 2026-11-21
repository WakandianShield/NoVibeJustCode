import { learning as service } from "./service.mjs";
export const controller = {
  courses: async (req, res) => res.json(await service.courses()),
  route: async (req, res) =>
    res.json(await service.route(Number(req.params.id), req.user)),
  section: async (req, res) =>
    res.json(await service.section(req.user, Number(req.params.id))),
  lesson: async (req, res) =>
    res.json(await service.lesson(req.user, Number(req.params.id))),
  read: async (req, res) =>
    res.json(await service.read(req.user, Number(req.params.id))),
  evaluate: async (req, res) =>
    res.json(
      await service.evaluate(req.user, Number(req.body.id_ejercicio), req.body),
    ),
  run: async (req, res) =>
    res.json(
      await service.evaluate(req.user, Number(req.params.id), req.body, true),
    ),
  attempt: async (req, res) =>
    res.json(await service.attempt(req.user, Number(req.params.id))),
  progress: async (req, res) => res.json(await service.progress(req.user)),
  badges: async (req, res) => res.json(await service.badges(req.user)),
};

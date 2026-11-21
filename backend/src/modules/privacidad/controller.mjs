import { privacy as service } from "./service.mjs";
export const controller = {
  export: async (req, res) =>
    res.json(await service.export(req.user, req.body)),
  erase: async (req, res) => res.json(await service.erase(req.user, req.body)),
};

import { accounts } from "./service.mjs";

const cookie = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 86400000,
};
async function loginResult(res, result) {
  res.cookie("nvjc", result.token, cookie).json(result.usuario);
}
export const accountController = {
  register: async (req, res) =>
    loginResult(res, await accounts.register(req.body)),
  login: async (req, res) => loginResult(res, await accounts.login(req.body)),
  logout: async (req, res) => {
    await accounts.logout(req.user);
    res.clearCookie("nvjc", { path: "/" }).json({ ok: true });
  },
  me: async (req, res) => res.json(await accounts.me(req.user)),
  update: async (req, res) =>
    res.json(await accounts.update(req.user, req.body)),
  search: async (req, res) =>
    res.json(await accounts.search(req.query.busqueda)),
  profile: async (req, res) =>
    res.json(await accounts.profile(req.params.usuario)),
  image: async (req, res) =>
    res.json(await accounts.image(req.user, req.params.tipo, req.file)),
};

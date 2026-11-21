import { learningRepo as repo } from "./repository.mjs";
import { subscriptionsRepo } from "../suscripciones/repository.mjs";
import { accountRepo } from "../cuentas/repository.mjs";
import { assert, cleanFiles } from "../../domain.mjs";
import { parseJson } from "../../config/db.js";
import { evaluate } from "../../adapters/evaluation.mjs";
export const learning = {
  async refresh(user, course, cx) {
    const complete = (await repo.completedSections(user, course, cx)).map(
      (x) => x.numero,
    );
    if ([1, 2, 3, 4, 5].every((x) => complete.includes(x)))
      await repo.award(user, course, 5, cx);
    if (complete.length === 10) await repo.award(user, course, 10, cx);
    return complete;
  },
  async route(course, user) {
    const c = await repo.course(course);
    assert(c, 404, "Curso no encontrado.");
    const sections = await repo.sections(course),
      complete = user ? await this.refresh(user.id_usuario, course) : [],
      pro = user
        ? Boolean(await subscriptionsRepo.active(user.id_usuario))
        : false;
    return {
      ...c,
      secciones: sections.map((s) => ({
        ...s,
        completada: complete.includes(s.numero),
        accesible:
          Boolean(user) &&
          (s.numero <= 5 || pro) &&
          (s.numero === 1 || complete.includes(s.numero - 1)),
        plan: s.numero <= 5 ? "Gratis" : "Pro",
      })),
      gratis: complete.filter((x) => x <= 5).length,
      total: complete.length,
    };
  },
  async access(user, id) {
    const s = await repo.section(id);
    assert(s && s.estado === "publicado", 404, "Sección no encontrada.");
    assert(
      s.numero <= 5 || (await subscriptionsRepo.active(user.id_usuario)),
      403,
      "Esta sección requiere Pro vigente.",
    );
    if (s.numero > 1) {
      const complete = await this.refresh(user.id_usuario, s.id_curso);
      assert(
        complete.includes(s.numero - 1),
        403,
        "Completa primero la sección anterior.",
      );
    }
    return s;
  },
  async section(user, id) {
    const s = await this.access(user, id);
    return { ...s, lecciones: await repo.lessons(id) };
  },
  async lesson(user, id) {
    const l = await repo.lesson(id);
    assert(l, 404, "Lección no encontrada.");
    await this.access(user, l.id_seccion);
    const exercises = await repo.exercises(id);
    return {
      ...l,
      recursos: await repo.resources(id),
      ejercicios: await Promise.all(
        exercises.map(async (e) => ({
          ...e,
          plantilla: parseJson(e.plantilla),
          casos: (await repo.cases(e.id_ejercicio))
            .filter((c) => c.es_publico)
            .map((c) => ({
              entrada: c.entrada,
              salida_esperada: c.salida_esperada,
              tipo_criterio: c.tipo_criterio,
            })),
        })),
      ),
    };
  },
  async read(user, id) {
    const l = await repo.lesson(id);
    assert(l, 404, "Lección no encontrada.");
    await this.access(user, l.id_seccion);
    for (const e of await repo.lessonChecks(id))
      assert(
        await repo.passed(user.id_usuario, e.id_ejercicio),
        409,
        "Aprueba la práctica de esta lección antes de completarla.",
      );
    await repo.completeLesson(user.id_usuario, id);
    await this.refresh(user.id_usuario, l.id_curso);
    return { completada: true };
  },
  async evaluate(user, id, body, runOnly = false) {
    const e = await repo.exercise(id);
    assert(e, 404, "Práctica no encontrada.");
    const s = await this.access(user, e.id_seccion),
      files = cleanFiles(body.archivos);
    const code = Object.values(files).join("\n");
    const cases = await repo.cases(id);
    if (runOnly)
      return evaluate(
        s.tecnologia,
        e.modo_evaluacion,
        files,
        cases.filter((c) => c.es_publico).slice(0, 1),
        true,
        body.stdin || "",
      );
    const attempt = await repo.attempt(user.id_usuario, id, code, files);
    try {
      const result = await evaluate(
        s.tecnologia,
        e.modo_evaluacion,
        files,
        cases,
      );
      await repo.finish(attempt, result);
      if (result.estado === "aprobado") {
        await repo.completeLesson(user.id_usuario, e.id_leccion);
        await this.refresh(user.id_usuario, s.id_curso);
      }
      return { id_intento: attempt, ...result };
    } catch (err) {
      await repo.finish(attempt, {
        estado: "pendiente",
        detalle:
          "Servicio de evaluación no disponible. Conservamos tu solución; puedes reintentar.",
      });
      throw err;
    }
  },
  async progress(user) {
    const cs = await repo.courses();
    return Promise.all(cs.map((c) => this.route(c.id_curso, user)));
  },
  badges: (user) => accountRepo.badges(user.id_usuario),
  courses: () => repo.courses(),
  attempt: (user, id) => repo.attemptById(id, user.id_usuario),
};

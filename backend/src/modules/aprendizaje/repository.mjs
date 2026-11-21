import { q, one } from "../../config/db.js";
export const learningRepo = {
  courses: () =>
    q("SELECT * FROM cursos WHERE estado='publicado' ORDER BY orden"),
  course: (id) =>
    one("SELECT * FROM cursos WHERE id_curso=? AND estado='publicado'", [id]),
  sections: (course) =>
    q(
      "SELECT * FROM secciones WHERE id_curso=? AND estado='publicado' ORDER BY numero",
      [course],
    ),
  section: (id, cx) =>
    one(
      "SELECT s.*,c.tecnologia FROM secciones s JOIN cursos c USING(id_curso) WHERE id_seccion=?",
      [id],
      cx,
    ),
  lessons: (section) =>
    q(
      "SELECT * FROM lecciones WHERE id_seccion=? AND estado='publicado' ORDER BY orden",
      [section],
    ),
  lesson: (id) =>
    one(
      "SELECT l.*,s.id_curso,s.numero FROM lecciones l JOIN secciones s USING(id_seccion) WHERE id_leccion=?",
      [id],
    ),
  resources: (lesson) =>
    q("SELECT * FROM recursos WHERE id_leccion=?", [lesson]),
  exercises: (lesson) =>
    q(
      "SELECT id_ejercicio,id_leccion,enunciado,plantilla,modo_evaluacion FROM ejercicios WHERE id_leccion=?",
      [lesson],
    ),
  exercise: (id) =>
    one(
      "SELECT e.*,l.id_seccion FROM ejercicios e JOIN lecciones l USING(id_leccion) WHERE id_ejercicio=?",
      [id],
    ),
  cases: (exercise) =>
    q("SELECT * FROM casos_prueba WHERE id_ejercicio=? ORDER BY orden", [
      exercise,
    ]),
  progress: (user, cx) =>
    q(
      "SELECT p.*,l.id_seccion FROM progreso p JOIN lecciones l USING(id_leccion) WHERE id_usuario=?",
      [user],
      cx,
    ),
  async completeLesson(user, lesson, cx) {
    await q(
      "INSERT INTO progreso(id_usuario,id_leccion) VALUES(?,?) ON DUPLICATE KEY UPDATE completada=1,fecha=CURRENT_TIMESTAMP",
      [user, lesson],
      cx,
    );
  },
  lessonChecks: (lesson) =>
    q("SELECT id_ejercicio FROM ejercicios WHERE id_leccion=?", [lesson]),
  passed: (user, exercise) =>
    one(
      "SELECT id_intento FROM intentos WHERE id_usuario=? AND id_ejercicio=? AND estado='aprobado' LIMIT 1",
      [user, exercise],
    ),
  async attempt(user, e, code, files) {
    const r = await q(
      "INSERT INTO intentos(id_usuario,id_ejercicio,codigo,archivos_practica) VALUES(?,?,?,?)",
      [user, e, code, JSON.stringify(files)],
    );
    return r.insertId;
  },
  finish: (id, r) =>
    q(
      "UPDATE intentos SET estado=?,casos_aprobados=?,total_casos=?,retroalimentacion=? WHERE id_intento=?",
      [r.estado, r.aprobados || 0, r.total || 0, r.detalle || "", id],
    ),
  attemptById: (id, user) =>
    one(
      "SELECT id_intento,id_ejercicio,estado,casos_aprobados,total_casos,retroalimentacion,fecha FROM intentos WHERE id_intento=? AND id_usuario=?",
      [id, user],
    ),
  completedSections: (user, course, cx) =>
    q(
      `SELECT s.numero FROM secciones s WHERE s.id_curso=? AND (
 (s.numero<10 AND EXISTS(SELECT 1 FROM lecciones l WHERE l.id_seccion=s.id_seccion) AND NOT EXISTS(SELECT 1 FROM lecciones l WHERE l.id_seccion=s.id_seccion AND NOT EXISTS(SELECT 1 FROM progreso p WHERE p.id_leccion=l.id_leccion AND p.id_usuario=? AND p.completada=1)))
 OR (s.numero=10 AND EXISTS(SELECT 1 FROM proyectos p WHERE p.id_seccion=s.id_seccion AND p.id_usuario=? AND p.estado_compilacion='valido'))
 ) ORDER BY numero`,
      [course, user, user],
      cx,
    ),
  award: (user, course, meta, cx) =>
    q(
      "INSERT IGNORE INTO usuario_logro(id_usuario,id_logro) SELECT ?,id_logro FROM logros WHERE id_curso=? AND seccion_meta=?",
      [user, course, meta],
      cx,
    ),
};

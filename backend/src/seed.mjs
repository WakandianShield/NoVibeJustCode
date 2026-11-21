import { readFile } from "node:fs/promises";
import { pool, q, tx } from "./config/db.js";
const schema = await readFile(
  new URL("../../database/schema.sql", import.meta.url),
  "utf8",
);
for (const statement of schema
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean))
  await q(statement);
const catalog = JSON.parse(
  await readFile(
    new URL("../../database/curriculum.json", import.meta.url),
    "utf8",
  ),
);
await tx(async (cx) => {
  for (const c of catalog) {
    await q(
      "INSERT INTO cursos(id_curso,titulo,descripcion,tecnologia,nivel,orden) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE titulo=VALUES(titulo),descripcion=VALUES(descripcion)",
      [c.id, c.titulo, c.descripcion, c.tecnologia, "Progresivo", c.id],
      cx,
    );
    for (const s of c.secciones) {
      await q(
        "INSERT INTO secciones(id_seccion,id_curso,numero,titulo,objetivo,tipo,configuracion_proyecto) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE titulo=VALUES(titulo),objetivo=VALUES(objetivo),configuracion_proyecto=VALUES(configuracion_proyecto)",
        [
          s.id,
          c.id,
          s.numero,
          s.titulo,
          s.objetivo,
          s.tipo,
          JSON.stringify(s.configuracion_proyecto),
        ],
        cx,
      );
      const l = s.leccion;
      await q(
        "INSERT INTO lecciones(id_leccion,id_seccion,titulo,contenido,orden) VALUES(?,?,?,?,1) ON DUPLICATE KEY UPDATE titulo=VALUES(titulo),contenido=VALUES(contenido)",
        [l.id, s.id, l.titulo, l.contenido],
        cx,
      );
      await q(
        "INSERT INTO recursos(id_leccion,direccion,autor,licencia,fuente) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE direccion=VALUES(direccion)",
        [
          l.id,
          l.recurso.direccion,
          l.recurso.autor,
          l.recurso.licencia,
          l.recurso.fuente,
        ],
        cx,
      );
      if (s.ejercicio) {
        const e = s.ejercicio;
        await q(
          "INSERT INTO ejercicios(id_ejercicio,id_leccion,enunciado,plantilla,solucion_referencia,modo_evaluacion) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE enunciado=VALUES(enunciado),plantilla=VALUES(plantilla),solucion_referencia=VALUES(solucion_referencia),modo_evaluacion=VALUES(modo_evaluacion)",
          [
            e.id,
            l.id,
            e.enunciado,
            JSON.stringify(e.plantilla),
            JSON.stringify(e.solucion_referencia),
            e.modo_evaluacion,
          ],
          cx,
        );
        for (let i = 0; i < e.casos.length; i++) {
          const t = e.casos[i];
          await q(
            "INSERT INTO casos_prueba(id_ejercicio,entrada,salida_esperada,es_publico,orden,tipo_criterio) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE entrada=VALUES(entrada),salida_esperada=VALUES(salida_esperada),es_publico=VALUES(es_publico),tipo_criterio=VALUES(tipo_criterio)",
            [
              e.id,
              t.entrada,
              t.salida_esperada,
              t.es_publico,
              i,
              t.tipo_criterio,
            ],
            cx,
          );
        }
      }
    }
    for (const [offset, nivel, meta] of [
      [1, "Inicial", 5],
      [2, "Completo", 10],
    ])
      await q(
        "INSERT INTO logros(id_logro,id_curso,nombre,descripcion,nivel,seccion_meta) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre),descripcion=VALUES(descripcion)",
        [
          c.id * 10 + offset,
          c.id,
          c.tecnologia + " · " + nivel,
          "Completaste " + meta + " secciones de " + c.tecnologia + ".",
          nivel,
          meta,
        ],
        cx,
      );
  }
});
console.log(
  "Base de datos inicializada: 5 cursos, 50 secciones, 40 prácticas y 10 insignias.",
);
await pool.end();

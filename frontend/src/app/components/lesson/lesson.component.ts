import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { EditorComponent } from "../editor/editor.component";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { LessonService } from "./lesson.service";
import { AuthService } from "../auth/auth.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];

@Component({
  standalone: true,
  imports: [...common, EditorComponent],
  templateUrl: "./lesson.component.html",
  styleUrl: "./lesson.component.css",
})
export class LessonComponent extends Page implements OnInit {
  service = inject(LessonService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  section = signal<any>(null);
  lesson = signal<any>(null);
  files = signal<Record<string, string> | null>(null);
  result = signal("");
  sanitizer = inject(DomSanitizer);
  session = inject(AuthService);
  previewDoc = signal<SafeHtml | null>(null);
  stdin = "";
  key = "";
  async ngOnInit() {
    const s = await this.task(() =>
      this.service.getSection(this.route.snapshot.paramMap.get("id")!),
    );
    if (s) {
      this.section.set(s);
      if (s.lecciones.length) await this.open(s.lecciones[0].id_leccion);
    }
  }
  async open(id: number) {
    const l = await this.task(() => this.service.getLesson(id));
    if (l) {
      this.lesson.set(l);
      const e = l.ejercicios[0];
      if (e) {
        this.key =
          "nvjc-practica-" +
          this.session.user().id_usuario +
          "-" +
          e.id_ejercicio;
        let f = e.plantilla;
        try {
          f = JSON.parse(localStorage.getItem(this.key) || "null") || f;
        } catch {}
        this.files.set(f);
        this.stdin = e.casos[0]?.entrada || "";
      }
    }
  }
  setFiles(f: Record<string, string>) {
    this.files.set(f);
    localStorage.setItem(this.key, JSON.stringify(f));
  }
  reset(e: any) {
    if (
      confirm(
        "¿Restablecer la plantilla? Se perderán los cambios de este borrador.",
      )
    ) {
      this.files.set(null);
      localStorage.removeItem(this.key);
      setTimeout(() => this.files.set({ ...e.plantilla }), 0);
    }
  }
  async run(id: number, evaluate: boolean) {
    const r = await this.task(() =>
      evaluate
        ? this.service.evaluate(id, this.files())
        : this.service.run(id, this.files(), this.stdin),
    );
    if (r) {
      this.result.set(r.estado + "\n" + r.detalle);
      if (r.estado === "aprobado")
        this.notice.set(
          "Práctica aprobada. Tu progreso e insignias se actualizaron.",
        );
    }
  }
  async markRead() {
    await this.task(async () => {
      await this.service.markRead(this.lesson().id_leccion);
      this.notice.set("Sección completada. Ya puedes continuar en la ruta.");
    });
  }
  async createProject() {
    await this.task(async () => {
      const p = await this.service.createProject(this.section().id_seccion);
      await this.router.navigate(["/proyecto", p.id_proyecto]);
    });
  }
  preview() {
    const f = this.files() || {};
    let html = f["index.html"] || "";
    html = html
      .replace(
        /<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
        (_, name) =>
          "<script>" +
          String(f[name] || "").replace(/<\/script/gi, "<\\/script") +
          "</script>",
      )
      .replace(
        /<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi,
        (_, name) => "<style>" + (f[name] || "") + "</style>",
      );
    html = html.replace(
      "<head>",
      "<head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'\">",
    );
    this.previewDoc.set(this.sanitizer.bypassSecurityTrustHtml(html));
  }
}

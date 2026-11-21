import { Component, inject, signal, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink, ActivatedRoute } from "@angular/router";
import { EditorComponent } from "../editor/editor.component";
import { ProjectDetailService } from "./project-detail.service";
import { AuthService } from "../auth/auth.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];
declare const window: any;

@Component({
  standalone: true,
  imports: [...common, EditorComponent],
  templateUrl: "./project-detail.component.html",
  styleUrl: "./project-detail.component.css",
})
export class ProjectComponent extends Page implements OnInit, OnDestroy {
  service = inject(ProjectDetailService);
  session = inject(AuthService);
  route = inject(ActivatedRoute);
  project = signal<any>(null);
  files = signal<Record<string, string>>({});
  title = "";
  dirty = signal(false);
  key = "";
  handler = (e: BeforeUnloadEvent) => {
    if (this.dirty()) {
      e.preventDefault();
    }
  };
  names() {
    return Object.keys(this.files());
  }
  async ngOnInit() {
    const r = await this.task(() =>
      this.service.get(this.route.snapshot.paramMap.get("id")!),
    );
    if (r) {
      this.project.set(r);
      this.title = r.titulo;
      this.key =
        "nvjc-proyecto-" + r.id_proyecto + "-" + this.session.user().id_usuario;
      let files = r.archivos_borrador;
      try {
        const draft = JSON.parse(localStorage.getItem(this.key) || "null");
        if (draft && draft.version === r.version && this.session.user()?.pro) {
          files = draft.files;
          this.dirty.set(true);
        }
      } catch {}
      this.files.set(files);
      window.addEventListener("beforeunload", this.handler);
    }
  }
  changed(files: Record<string, string>) {
    if (!this.session.user()?.pro) return;
    this.files.set(files);
    this.dirty.set(true);
    localStorage.setItem(
      this.key,
      JSON.stringify({ version: this.project().version, files }),
    );
  }
  add() {
    const name = prompt("Ruta relativa del archivo (ejemplo: src/main.js)");
    if (!name) return;
    if (this.files()[name] !== undefined) {
      this.error.set("Ese archivo ya existe.");
      return;
    }
    this.changed({ ...this.files(), [name]: "" });
  }
  rename(old: string) {
    const name = prompt("Nueva ruta del archivo", old);
    if (!name || name === old) return;
    if (Object.hasOwn(this.files(), name)) {
      this.error.set("Ese archivo ya existe.");
      return;
    }
    const files = { ...this.files(), [name]: this.files()[old] };
    delete files[old];
    this.changed(files);
  }
  remove(name: string) {
    if (!confirm("¿Eliminar " + name + "?")) return;
    const files = { ...this.files() };
    delete files[name];
    this.changed(files);
  }
  async save() {
    return this.task(async () => {
      const p = this.project();
      const r = await this.service.save(p.id_proyecto, {
        titulo: this.title,
        descripcion: p.descripcion,
        version: p.version,
        archivos: this.files(),
      });
      this.project.set(r);
      this.files.set(r.archivos_borrador);
      localStorage.removeItem(this.key);
      this.dirty.set(false);
      this.notice.set("Proyecto guardado.");
      return r;
    });
  }
  async finalize() {
    const saved = await this.save();
    if (!saved) return;
    const r = await this.task(() => this.service.finalize(saved.id_proyecto));
    if (r) {
      this.project.set(r);
      this.notice.set(
        r.resultado_validacion?.valido
          ? "Proyecto completado. Tu insignia completa está en tu perfil."
          : "Revisa el diagnóstico para corregir tu código.",
      );
    }
  }
  ngOnDestroy() {
    window.removeEventListener("beforeunload", this.handler);
  }
}

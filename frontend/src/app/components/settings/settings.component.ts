import { Component, inject, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { SettingsService } from "./settings.service";
import { AuthService } from "../auth/auth.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule];

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.css",
})
export class SettingsComponent extends Page implements OnInit, OnDestroy {
  service = inject(SettingsService);
  session = inject(AuthService);
  router = inject(Router);
  form = { nombre: "", nombre_usuario: "", descripcion: "" };
  private noticeTimer?: ReturnType<typeof setTimeout>;

  private showNotice(message: string) {
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.notice.set(message);
    this.noticeTimer = setTimeout(() => {
      this.notice.set("");
      this.noticeTimer = undefined;
    }, 5000);
  }

  ngOnDestroy() {
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
  }

  ngOnInit() {
    this.form = { ...this.session.user() };
  }
  async save() {
    await this.task(async () => {
      await this.service.saveProfile(this.form);
      await this.session.refresh();
      this.showNotice("Perfil actualizado.");
    });
  }
  async image(event: Event, type: string) {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = "";
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      this.error.set("La imagen no debe superar los 10 MB.");
      return;
    }
    await this.task(async () => {
      await this.service.uploadProfileImage(type, f);
      await this.session.refresh();
      this.showNotice("Imagen actualizada.");
    });
  }
  async erase() {
    if (
      !confirm(
        "¿Eliminar tu cuenta y tus proyectos? Esta acción no se puede deshacer.",
      )
    )
      return;
    const password = window.prompt("Confirma tu contraseña para eliminar tu cuenta.");
    if (password === null || !password.trim()) return;
    await this.task(async () => {
      await this.service.deleteAccount(password);
      this.session.user.set(null);
      await this.router.navigateByUrl("/");
    });
  }
}

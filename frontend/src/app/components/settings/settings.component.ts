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
  private pendingImages: Partial<Record<"foto" | "banner", File>> = {};
  private previews: Partial<Record<"foto" | "banner", string>> = {};
  private noticeTimer?: ReturnType<typeof setTimeout>;

  get photoPreview() {
    return this.previews.foto || this.session.user()?.foto_url || "/avatar.svg";
  }

  get bannerPreview() {
    return this.previews.banner || this.session.user()?.banner_url || "";
  }

  private clearImageDrafts() {
    for (const url of Object.values(this.previews)) URL.revokeObjectURL(url);
    this.previews = {};
    this.pendingImages = {};
  }

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
    this.clearImageDrafts();
  }

  ngOnInit() {
    this.form = { ...this.session.user() };
  }
  async save() {
    if (this.busy()) return;
    await this.task(async () => {
      await this.service.saveProfile({ ...this.form });
      for (const type of ["foto", "banner"] as const) {
        const file = this.pendingImages[type];
        if (file) await this.service.uploadProfileImage(type, file);
      }
      await this.session.refresh();
      this.clearImageDrafts();
      this.showNotice("Perfil actualizado.");
    });
  }
  image(event: Event, type: "foto" | "banner") {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = "";
    if (!f || this.busy()) return;
    if (f.size > 10 * 1024 * 1024) {
      this.error.set("La imagen no debe superar los 10 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      this.error.set("Selecciona una imagen JPEG, PNG o WebP.");
      return;
    }
    const preview = URL.createObjectURL(f);
    if (this.previews[type]) URL.revokeObjectURL(this.previews[type]!);
    this.pendingImages[type] = f;
    this.previews[type] = preview;
    this.error.set("");
    this.notice.set("");
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

import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink, Router } from "@angular/router";
import { SettingsService } from "./settings.service";
import { AuthService } from "../auth/auth.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.css",
})
export class SettingsComponent extends Page implements OnInit {
  service = inject(SettingsService);
  session = inject(AuthService);
  router = inject(Router);
  form = { nombre: "", nombre_usuario: "", descripcion: "" };
  password = "";
  ngOnInit() {
    this.form = { ...this.session.user() };
  }
  async save() {
    await this.task(async () => {
      await this.service.saveProfile(this.form);
      await this.session.refresh();
      this.notice.set("Perfil actualizado.");
    });
  }
  async image(event: Event, type: string) {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (!f) return;
    await this.task(async () => {
      await this.service.uploadProfileImage(type, f);
      await this.session.refresh();
      this.notice.set("Imagen actualizada.");
    });
  }
  async exportData() {
    await this.task(async () => {
      const r = await this.service.exportData(this.password);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(r, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "Mis-datos-NoVibeJustCode.json";
      a.click();
      URL.revokeObjectURL(url);
      this.password = "";
    });
  }
  async erase() {
    if (
      !confirm(
        "¿Eliminar tu cuenta y tus proyectos? Esta acción no se puede deshacer.",
      )
    )
      return;
    await this.task(async () => {
      await this.service.deleteAccount(this.password);
      this.session.user.set(null);
      await this.router.navigateByUrl("/");
    });
  }
}

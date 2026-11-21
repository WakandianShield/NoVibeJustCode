import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { AuthService } from "./auth.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./auth.component.html",
  styleUrl: "./auth.component.css",
})
export class AuthComponent extends Page {
  route = inject(ActivatedRoute);
  auth = inject(AuthService);
  router = inject(Router);
  register = this.route.snapshot.data["register"] === true;
  visible = false;
  form = { nombre: "", nombre_usuario: "", correo: "", contrasena: "" };
  async submit() {
    await this.task(async () => {
      await this.auth.login(this.form, this.register);
      const back = this.route.snapshot.queryParamMap.get("volver");
      await this.router.navigateByUrl(
        back?.startsWith("/") && !back.startsWith("//") ? back : "/aprendizaje",
      );
    });
  }
}

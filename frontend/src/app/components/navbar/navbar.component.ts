import { Component, inject, signal } from "@angular/core";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { PixelCtaComponent } from "../pixel-cta/pixel-cta.component";
import { AuthService } from "../auth/auth.service";

@Component({
  selector: "nv-navbar",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, PixelCtaComponent],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.css",
})
export class NavbarComponent {
  session = inject(AuthService);
  router = inject(Router);
  menu = signal(false);

  isLoginPage(): boolean {
    return this.router.url.startsWith("/acceso");
  }
}

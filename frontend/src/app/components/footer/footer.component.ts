import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "nv-footer",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./footer.component.html",
  styleUrl: "./footer.component.css",
})
export class FooterComponent {
  readonly content = {
    tagline: "Aprende algo. Construye algo. Hazlo tuyo.",
    notice: "Capacitación no formal · Sin RVOE",
    links: [
      { path: "/legal/terminos", label: "Términos" },
      { path: "/legal/privacidad", label: "Privacidad" },
      { path: "/legal/cancelacion", label: "Cancelaciones" },
    ],
  };
}

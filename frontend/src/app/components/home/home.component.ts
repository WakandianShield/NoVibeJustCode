import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PixelCtaComponent } from "../pixel-cta/pixel-cta.component";
import { HomeService } from "./home.service";
const common = [CommonModule, FormsModule, RouterLink];

@Component({
  standalone: true,
  imports: [...common, PixelCtaComponent],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
})
export class HomeComponent {
  data = inject(HomeService);
  get languages() {
    return this.data.languages;
  }
  get logos() {
    return this.data.logos;
  }
}

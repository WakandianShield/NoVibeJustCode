import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { CoursesService } from "./courses.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./courses.component.html",
  styleUrl: "./courses.component.css",
})
export class CoursesComponent extends Page implements OnInit {
  service = inject(CoursesService);
  route = inject(ActivatedRoute);
  mine = this.route.snapshot.data["mine"] === true;
  query = "";
  courses = signal<any[]>([]);
  icons = ["Py", "JS", "</>", "TS", "N"];
  filtered() {
    return this.courses().filter((c) =>
      c.titulo.toLowerCase().includes(this.query.toLowerCase()),
    );
  }
  async ngOnInit() {
    this.error.set(this.route.snapshot.queryParamMap.get("aviso") || "");
    const d = await this.task(() => this.service.list(this.mine));
    if (d) this.courses.set(d);
  }
}

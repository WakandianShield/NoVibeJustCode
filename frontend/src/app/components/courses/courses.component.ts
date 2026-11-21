import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { CoursesService } from "./courses.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, RouterLink];

type Course = {
  id_curso: number;
  titulo: string;
  tecnologia?: string;
  gratis?: number;
  total?: number;
};

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./courses.component.html",
  styleUrl: "./courses.component.css",
})
export class CoursesComponent extends Page implements OnInit {
  service = inject(CoursesService);
  route = inject(ActivatedRoute);
  courses = signal<Course[]>([]);

  private readonly logosByTechnology: Record<string, string[]> = {
    python: ["/python-logo.webp"],
    javascript: ["/js-logo.webp"],
    html: ["/html-css-logo.png"],
    typescript: ["/ts-logo.webp"],
    node: ["/nodejs-logo.webp"],
  };

  logosFor(course: Course): string[] {
    const technology = [course.tecnologia, course.titulo]
      .join(" ")
      .toLowerCase();
    const match = Object.entries(this.logosByTechnology).find(([name]) =>
      technology.includes(name),
    );

    return match?.[1] ?? [];
  }

  async ngOnInit() {
    this.error.set(this.route.snapshot.queryParamMap.get("aviso") || "");
    const d = await this.task(() => this.service.list());
    if (d) this.courses.set(d);
  }
}

import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { CourseDetailService } from "./course-detail.service";
import { AuthService } from "../auth/auth.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./course-detail.component.html",
  styleUrl: "./course-detail.component.css",
})
export class CourseComponent extends Page implements OnInit {
  service = inject(CourseDetailService);
  session = inject(AuthService);
  route = inject(ActivatedRoute);
  course = signal<any>(null);
  async ngOnInit() {
    await this.session.ready;
    const d = await this.task(() =>
      this.service.getRoute(this.route.snapshot.paramMap.get("id")!),
    );
    if (d) this.course.set(d);
  }
}

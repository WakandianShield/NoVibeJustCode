import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ProjectsService } from "./projects.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];
declare const window: any;

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./projects.component.html",
  styleUrl: "./projects.component.css",
})
export class ProjectsComponent extends Page implements OnInit {
  service = inject(ProjectsService);
  projects = signal<any[]>([]);
  async ngOnInit() {
    const r = await this.task(() => this.service.list());
    if (r) this.projects.set(r);
  }
}

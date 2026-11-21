import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { CommunityService } from "./community.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./community.component.html",
  styleUrl: "./community.component.css",
})
export class CommunityComponent extends Page implements OnInit {
  service = inject(CommunityService);
  profiles = signal<any[]>([]);
  query = "";
  ngOnInit() {
    this.search();
  }
  async search() {
    const r = await this.task(() => this.service.search(this.query));
    if (r) this.profiles.set(r);
  }
}

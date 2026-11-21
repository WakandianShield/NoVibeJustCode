import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { FriendsService } from "./friends.service";
import { AuthService } from "../auth/auth.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./friends.component.html",
  styleUrl: "./friends.component.css",
})
export class FriendsComponent extends Page implements OnInit {
  service = inject(FriendsService);
  session = inject(AuthService);
  friends = signal<any[]>([]);
  ngOnInit() {
    this.load();
  }
  async load() {
    const r = await this.task(() => this.service.list());
    if (r) this.friends.set(r);
  }
  async action(f: any, a: string) {
    const r = await this.task(() => this.service.update(f.id_amistad, a));
    if (r) await this.load();
  }
}

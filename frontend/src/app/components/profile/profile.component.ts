import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink, ActivatedRoute } from "@angular/router";
import { ProfileService } from "./profile.service";
import { AuthService } from "../auth/auth.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./profile.component.html",
  styleUrl: "./profile.component.css",
})
export class ProfileComponent extends Page implements OnInit {
  service = inject(ProfileService);
  session = inject(AuthService);
  route = inject(ActivatedRoute);
  profile = signal<any>(null);
  relation = signal<any>(null);
  detail = signal<any>(null);
  own() {
    return this.profile()?.id_usuario === this.session.user()?.id_usuario;
  }
  earned(id: number) {
    return this.profile()?.insignias.find((x: any) => x.id_logro === id);
  }
  async ngOnInit() {
    await this.session.ready;
    const name =
      this.route.snapshot.paramMap.get("usuario") ||
      this.session.user()?.nombre_usuario;
    if (!name) return;
    const p = await this.task(() => this.service.getProfile(name));
    if (p) {
      this.profile.set(p);
      if (this.session.user()) {
        this.relation.set(await this.service.getRelationship(p.id_usuario));
      }
    }
  }
  async request() {
    const r = await this.task(() =>
      this.service.requestFriendship(this.profile().id_usuario),
    );
    if (r) this.relation.set(r);
  }
}

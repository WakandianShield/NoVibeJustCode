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
  spinningBadges = signal(new Set<number>());
  spinBadge(id: number, event?: PointerEvent) {
    if (event && event.pointerType !== "mouse") return;
    this.spinningBadges.update((ids) => new Set([...ids, id]));
  }
  finishBadgeSpin(id: number) {
    this.spinningBadges.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }
  own() {
    return this.profile()?.id_usuario === this.session.user()?.id_usuario;
  }
  earned(id: number) {
    return this.profile()?.insignias.find((x: any) => x.id_logro === id);
  }
  badgeImage(badge: any): string {
    const technologyImages: Record<string, string> = {
      python: "python",
      javascript: "javascript",
      "html y css": "css_html",
      typescript: "typescript",
      "node.js": "nodejs",
    };
    const prefix = technologyImages[String(badge.tecnologia).toLowerCase()];
    const level = badge.nivel === "Completo" ? "experto" : "fundamentos";
    return prefix ? `/${prefix}_${level}.png` : "/avatar.svg";
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

import { inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly user = signal<any>(null);
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      this.user.set(await this.api.get("/mi/perfil"));
    } catch {
      this.user.set(null);
    }
  }

  async login(body: any, register = false) {
    const user = await this.api.post(register ? "/cuentas" : "/acceso", body);
    this.user.set(user);
    return user;
  }

  async logout(): Promise<void> {
    try {
      await this.api.delete("/acceso/actual");
    } finally {
      this.user.set(null);
      await this.router.navigateByUrl("/");
    }
  }
}

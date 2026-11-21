import { inject, Injectable } from "@angular/core";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class SettingsService {
  private readonly api = inject(ApiService);

  saveProfile(profile: any) {
    return this.api.patch("/mi/perfil", profile);
  }

  uploadProfileImage(type: string, image: File) {
    const body = new FormData();
    body.append("imagen", image);
    return this.api.post(`/mi/perfil/${type}`, body);
  }

  exportData(password: string) {
    return this.api.post("/mi/datos/exportacion", { contrasena: password });
  }

  deleteAccount(password: string) {
    return this.api.delete("/mi/cuenta", { contrasena: password });
  }
}

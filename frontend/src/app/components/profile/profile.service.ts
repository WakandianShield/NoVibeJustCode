import { inject, Injectable } from "@angular/core";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class ProfileService {
  private readonly api = inject(ApiService);

  getProfile(username: string) {
    return this.api.get(`/perfiles/${encodeURIComponent(username)}`);
  }

  async getRelationship(userId: number) {
    const relationships = await this.api.get<any[]>("/amistades");
    return (
      relationships.find((relationship) =>
        [relationship.id_usuario_a, relationship.id_usuario_b].includes(userId),
      ) ?? null
    );
  }

  requestFriendship(userId: number) {
    return this.api.post("/amistades", { id_usuario: userId });
  }
}

import { inject, Injectable } from "@angular/core";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class FriendsService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<any[]>("/amistades");
  }

  update(relationshipId: number, action: string) {
    return this.api.post(`/amistades/${relationshipId}/${action}`);
  }
}

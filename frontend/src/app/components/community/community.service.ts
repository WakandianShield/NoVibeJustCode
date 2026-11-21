import { inject, Injectable } from "@angular/core";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class CommunityService {
  private readonly api = inject(ApiService);

  search(term: string) {
    return this.api.get(`/perfiles?busqueda=${encodeURIComponent(term)}`);
  }
}

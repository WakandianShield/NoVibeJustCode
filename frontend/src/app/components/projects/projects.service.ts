import { inject, Injectable } from "@angular/core";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class ProjectsService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get("/proyectos");
  }
}

import { inject, Injectable } from "@angular/core";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class CoursesService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get("/cursos");
  }
}

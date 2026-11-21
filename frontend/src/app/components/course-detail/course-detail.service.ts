import { inject, Injectable } from "@angular/core";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class CourseDetailService {
  private readonly api = inject(ApiService);

  getRoute(courseId: string | number) {
    return this.api.get(`/cursos/${courseId}/ruta`);
  }
}

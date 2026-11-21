import { inject, Injectable } from "@angular/core";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class ProjectDetailService {
  private readonly api = inject(ApiService);

  get(projectId: string | number) {
    return this.api.get(`/proyectos/${projectId}`);
  }

  save(projectId: number, body: any) {
    return this.api.patch(`/proyectos/${projectId}`, body);
  }

  finalize(projectId: number) {
    return this.api.post(`/proyectos/${projectId}/finalizar`);
  }
}

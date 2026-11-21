import { inject, Injectable } from "@angular/core";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class LessonService {
  private readonly api = inject(ApiService);

  getSection(sectionId: string | number) {
    return this.api.get(`/secciones/${sectionId}`);
  }

  getLesson(lessonId: number) {
    return this.api.get(`/lecciones/${lessonId}`);
  }

  markRead(lessonId: number) {
    return this.api.post(`/lecciones/${lessonId}/lectura`);
  }

  evaluate(exerciseId: number, files: Record<string, string> | null) {
    return this.api.post("/evaluaciones", {
      id_ejercicio: exerciseId,
      archivos: files,
    });
  }

  run(exerciseId: number, files: Record<string, string> | null, stdin: string) {
    return this.api.post(`/ejercicios/${exerciseId}/ejecutar`, {
      archivos: files,
      stdin,
    });
  }

  createProject(sectionId: number) {
    return this.api.post("/proyectos", { id_seccion: sectionId });
  }
}

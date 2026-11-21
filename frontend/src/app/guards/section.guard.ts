import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../components/auth/auth.service";
import { LessonService } from "../components/lesson/lesson.service";

export const sectionGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const lesson = inject(LessonService);
  const router = inject(Router);

  await auth.ready;
  if (!auth.user()) {
    return router.createUrlTree(["/acceso"]);
  }

  try {
    await lesson.getSection(route.paramMap.get("id")!);
    return true;
  } catch (error: any) {
    return router.createUrlTree(["/cursos"], {
      queryParams: {
        aviso: error.error?.error || "Revisa tu acceso.",
      },
    });
  }
};

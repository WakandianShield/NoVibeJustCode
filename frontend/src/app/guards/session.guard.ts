import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../components/auth/auth.service";

export const sessionGuard: CanActivateFn = async (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;
  return auth.user()
    ? true
    : router.createUrlTree(["/acceso"], {
        queryParams: { volver: state.url },
      });
};

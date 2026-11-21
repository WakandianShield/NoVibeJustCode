import { HttpInterceptorFn } from "@angular/common/http";

export const apiInterceptor: HttpInterceptorFn = (request, next) =>
  next(
    request.clone({
      withCredentials: true,
      setHeaders: { "X-Requested-With": "NoVibeJustCode" },
    }),
  );

import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";

@Injectable({ providedIn: "root" })
export class PixelCtaService {
  private readonly router = inject(Router);
  private pendingNavigation = false;

  begin(route: string | null): void {
    this.pendingNavigation = Boolean(route);
  }
  finish(event: TransitionEvent, route: string | null): void {
    if (event.propertyName !== "transform" || !this.pendingNavigation || !route)
      return;
    this.pendingNavigation = false;
    void this.router.navigateByUrl(route);
  }
}

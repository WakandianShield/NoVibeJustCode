import { Component, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter, map } from "rxjs";
import { NavbarComponent } from "./components/navbar/navbar.component";
import { FooterComponent } from "./components/footer/footer.component";

@Component({
  selector: "nv-app",
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
  host: { "[class.messaging-page]": "messaging()" },
})
export class AppComponent {
  private router = inject(Router);
  messaging = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => /^\/mensajes(?:\/|[?#]|$)/.test(event.urlAfterRedirects)),
    ),
    { initialValue: false },
  );
}

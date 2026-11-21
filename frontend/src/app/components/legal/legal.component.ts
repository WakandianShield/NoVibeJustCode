import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

@Component({
  standalone: true,
  templateUrl: "./legal.component.html",
  styleUrl: "./legal.component.css",
})
export class LegalComponent {
  private readonly route = inject(ActivatedRoute);
  readonly type = this.route.snapshot.paramMap.get("tipo");
}

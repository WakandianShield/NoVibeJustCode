import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
  inject,
} from "@angular/core";

import { PixelCtaService } from "./pixel-cta.service";

@Component({
  selector: "nv-pixel-cta",
  standalone: true,
  imports: [],
  templateUrl: "./pixel-cta.component.html",
  styleUrl: "./pixel-cta.component.css",
  encapsulation: ViewEncapsulation.None,
})
export class PixelCtaComponent {
  @Input() id = "pixel-start";
  @Input() label = "Comenzar";
  @Input() menuIcon = false;
  @Input() checked = false;
  @Input() route: string | null = null;
  @Output() checkedChange = new EventEmitter<boolean>();

  private readonly flow = inject(PixelCtaService);

  navigate(): void {
    this.flow.begin(this.route);
  }

  finishAnimation(event: TransitionEvent): void {
    this.flow.finish(event, this.route);
  }
}

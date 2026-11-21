import { Component, inject, signal, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PlansService } from "./plans.service";
import { AuthService } from "../auth/auth.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];
declare const window: any;

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./plans.component.html",
  styleUrl: "./plans.component.css",
})
export class PlansComponent extends Page implements OnInit, OnDestroy {
  service = inject(PlansService);
  session = inject(AuthService);
  config = signal<any>(null);
  mine = signal<any>(null);
  consent = false;
  buttons: any;
  destroyed = false;
  async ngOnInit() {
    await this.session.ready;
    const c = await this.task(() => this.service.paypalConfiguration());
    this.config.set(c);
    await this.load();
    if (c?.clientId && !window.paypal) {
      await new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.src =
          "https://www.paypal.com/sdk/js?client-id=" +
          encodeURIComponent(c.clientId) +
          "&vault=true&intent=subscription&currency=MXN";
        script.onload = () => resolve();
        script.onerror = () => {
          this.error.set("No fue posible cargar PayPal.");
          resolve();
        };
        document.head.append(script);
      });
    }
    await this.renderButtons();
  }
  async load() {
    if (this.session.user()) {
      const r = await this.task(() => this.service.subscription());
      if (r) this.mine.set(r);
    }
  }
  async renderButtons() {
    this.buttons?.close();
    if (
      !this.consent ||
      !window.paypal ||
      this.mine()?.activa ||
      this.destroyed
    )
      return;
    await new Promise((r) => setTimeout(r, 0));
    this.buttons = window.paypal.Buttons({
      style: { layout: "vertical", label: "subscribe" },
      createSubscription: async () => {
        if (!this.consent) throw Error("Acepta el cobro recurrente.");
        const r = await this.service.createSubscription();
        return r.id;
      },
      onApprove: async (data: any) => this.sync(data.subscriptionID),
      onError: () =>
        this.error.set(
          "PayPal no completó la operación. Consulta el estado antes de reintentar.",
        ),
      onCancel: () => this.notice.set("Contratación cancelada en PayPal."),
    });
    await this.buttons.render("#paypal-buttons");
  }
  async sync(id: string) {
    await this.task(async () => {
      await this.service.confirmSubscription(id);
      await this.session.refresh();
      await this.load();
      this.notice.set("Estado consultado con PayPal.");
    });
  }
  async cancel() {
    if (
      !confirm(
        "¿Cancelar los próximos cobros? Mantendrás el acceso hasta terminar el periodo pagado.",
      )
    )
      return;
    await this.task(async () => {
      this.mine.set(await this.service.cancelSubscription());
      await this.session.refresh();
      this.notice.set("Renovación cancelada.");
    });
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.buttons?.close();
  }
}

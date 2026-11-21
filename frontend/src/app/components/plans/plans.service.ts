import { inject, Injectable } from "@angular/core";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class PlansService {
  private readonly api = inject(ApiService);

  paypalConfiguration() {
    return this.api.get<{ clientId: string }>("/configuracion/paypal");
  }

  subscription() {
    return this.api.get<any>("/mi/suscripcion");
  }

  createSubscription() {
    return this.api.post<{ id: string }>("/suscripciones", {
      consentimiento: true,
    });
  }

  confirmSubscription(subscriptionId: string) {
    return this.api.post(
      `/suscripciones/${encodeURIComponent(subscriptionId)}/confirmar`,
    );
  }

  cancelSubscription() {
    return this.api.post("/mi/suscripcion/cancelar");
  }
}

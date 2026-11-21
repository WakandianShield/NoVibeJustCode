import { inject, Injectable, signal } from "@angular/core";
import { io, Socket } from "socket.io-client";
import { ApiService } from "../../services/api.service";

@Injectable({ providedIn: "root" })
export class ChatService {
  private readonly api = inject(ApiService);

  socket?: Socket;
  readonly connected = signal(false);

  listFriends() {
    return this.api.get<any[]>("/amistades");
  }

  history(relationshipId: number, before?: number) {
    const query = before ? `?antes=${before}` : "";
    return this.api.get<any[]>(`/amistades/${relationshipId}/mensajes${query}`);
  }

  connect(onMessage: (data: any) => void, onRead: (data: any) => void) {
    this.disconnect();
    this.socket = io({ withCredentials: true });
    this.socket.on("connect", () => this.connected.set(true));
    this.socket.on("disconnect", () => this.connected.set(false));
    this.socket.on("mensaje:confirmado", onMessage);
    this.socket.on("mensaje:leido", onRead);
    return this.socket;
  }

  send(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error("Sin conexión. Tu mensaje sigue pendiente."));
        return;
      }

      this.socket
        .timeout(10000)
        .emit("mensaje:enviar", data, (error: any, result: any) => {
          if (error) {
            reject(new Error("No se confirmó el envío. Puedes reintentarlo."));
          } else if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error));
          }
        });
    });
  }

  markRead(relationshipId: number): void {
    this.socket?.emit("mensaje:leer", { id_amistad: relationshipId });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.connected.set(false);
  }
}

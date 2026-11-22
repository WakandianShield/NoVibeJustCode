import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Injector,
  afterNextRender,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink, ActivatedRoute } from "@angular/router";
import { ChatService } from "./chat.service";
import { AuthService } from "../auth/auth.service";
import { Page } from "../../shared/page-state";
const common = [CommonModule, FormsModule, RouterLink];

@Component({
  standalone: true,
  imports: common,
  templateUrl: "./chat.component.html",
  styleUrl: "./chat.component.css",
})
export class ChatComponent extends Page implements OnInit, OnDestroy {
  chat = inject(ChatService);
  session = inject(AuthService);
  route = inject(ActivatedRoute);
  friends = signal<any[]>([]);
  current = signal<any>(null);
  messages = signal<any[]>([]);
  hasOlder = signal(false);
  text = "";
  draftKey = "";
  timer: any;
  @ViewChild("messageHistory") messageHistory?: ElementRef<HTMLDivElement>;
  private readonly injector = inject(Injector);

  private scrollToLatest() {
    const conversation = this.current()?.id_amistad;
    afterNextRender(
      () => {
        if (conversation !== this.current()?.id_amistad) return;
        const history = this.messageHistory?.nativeElement;
        if (history) history.scrollTop = history.scrollHeight;
      },
      { injector: this.injector },
    );
  }
  async ngOnInit() {
    this.draftKey = "nvjc-mensajes-" + this.session.user().id_usuario;
    await this.loadFriends();
    const socket = this.chat.connect(
      (m) => {
        if (m.id_amistad === this.current()?.id_amistad) {
          this.merge(m);
          this.chat.markRead(m.id_amistad);
        } else this.loadFriends();
      },
      (r) => {
        if (
          r.lector !== this.session.user().id_usuario &&
          r.id_amistad === this.current()?.id_amistad
        )
          this.messages.update((ms) =>
            ms.map((m) => ({
              ...m,
              leido_en: m.pendiente ? null : new Date().toISOString(),
            })),
          );
      },
    );
    socket.on("connect", () => {
      if (this.current()) this.open(this.current());
    });
    const id = Number(this.route.snapshot.paramMap.get("id"));
    const friend = this.friends().find((f) => f.id_amistad === id);
    if (friend) await this.open(friend);
    this.timer = setInterval(() => this.loadFriends(), 15000);
  }
  async loadFriends() {
    try {
      this.friends.set(
        (await this.chat.listFriends()).filter(
          (f: any) => f.estado === "aceptada",
        ),
      );
    } catch {}
  }
  pending() {
    try {
      return JSON.parse(localStorage.getItem(this.draftKey) || "[]");
    } catch {
      return [];
    }
  }
  storePending(items: any[]) {
    localStorage.setItem(this.draftKey, JSON.stringify(items));
  }
  merge(m: any) {
    this.messages.update((ms) =>
      [
        ...ms.filter((x) => x.id_cliente !== m.id_cliente),
        { ...m, pendiente: false },
      ].sort(
        (a, b) =>
          (a.id_mensaje || Number.MAX_SAFE_INTEGER) -
          (b.id_mensaje || Number.MAX_SAFE_INTEGER),
      ),
    );
    this.storePending(
      this.pending().filter((x: any) => x.id_cliente !== m.id_cliente),
    );
    if (m.id_amistad === this.current()?.id_amistad) this.scrollToLatest();
  }
  async open(f: any) {
    this.current.set(f);
    this.error.set("");
    const r = await this.task(() => this.chat.history(f.id_amistad));
    if (r) {
      const seen = new Set(r.map((m: any) => m.id_cliente));
      const pending = this.pending().filter(
        (m: any) => m.id_amistad === f.id_amistad && !seen.has(m.id_cliente),
      );
      this.messages.set([...r, ...pending]);
      this.hasOlder.set(r.length === 50);
      this.scrollToLatest();
      this.chat.markRead(f.id_amistad);
    }
  }
  async older() {
    const first = this.messages().find((m) => m.id_mensaje);
    if (!first) return;
    const r = await this.task(() =>
      this.chat.history(this.current().id_amistad, first.id_mensaje),
    );
    if (r) {
      this.messages.update((ms) => [...r, ...ms]);
      this.hasOlder.set(r.length === 50);
    }
  }
  async send() {
    if (!this.text.trim() || !this.current()) return;
    const m = {
      id_cliente: crypto.randomUUID(),
      id_amistad: this.current().id_amistad,
      texto: this.text.trim(),
      id_emisor: this.session.user().id_usuario,
      creado_en: new Date().toISOString(),
      pendiente: true,
    };
    this.text = "";
    this.messages.update((ms) => [...ms, m]);
    this.scrollToLatest();
    this.storePending([...this.pending(), m]);
    await this.retry(m);
  }
  async retry(m: any) {
    await this.task(async () => {
      this.merge(
        await this.chat.send({
          id_cliente: m.id_cliente,
          id_amistad: m.id_amistad,
          texto: m.texto,
        }),
      );
    });
  }
  ngOnDestroy() {
    clearInterval(this.timer);
    this.chat.disconnect();
  }
}

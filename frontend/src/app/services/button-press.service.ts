import { DOCUMENT } from "@angular/common";
import { DestroyRef, Injectable, inject } from "@angular/core";

const BUTTONS =
  'button, a.button, a[class*="-cta"], label.button, [role="button"], ' +
  'input[type="button"], input[type="submit"], input[type="reset"], summary';
const PRESSED = "site-button-press";

@Injectable({ providedIn: "root" })
export class ButtonPressService {
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);

  constructor() {
    const window = this.document.defaultView;
    if (!window) return;
    const controller = new AbortController();
    const timers = new Map<Element, number>();
    const clear = (button: Element) => {
      window.clearTimeout(timers.get(button));
      timers.delete(button);
      button.classList.remove(PRESSED);
    };
    const press = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest(BUTTONS);
      if (
        !button ||
        button.closest("nv-pixel-cta") ||
        button.matches(':disabled, [aria-disabled="true"]') ||
        button.classList.contains(PRESSED)
      )
        return;
      button.classList.add(PRESSED);
      // Fallback cleanup also handles removed elements and reduced motion.
      timers.set(
        button,
        window.setTimeout(() => clear(button), 650),
      );
    };
    const options = { capture: true, passive: true, signal: controller.signal };
    this.document.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button === 0) press(event);
      },
      options,
    );
    this.document.addEventListener(
      "keydown",
      (event) => {
        if (!event.repeat && ["Enter", " "].includes(event.key)) press(event);
      },
      options,
    );
    this.document.addEventListener("click", press, options);
    this.document.addEventListener(
      "animationend",
      (event) => {
        if (event.animationName === PRESSED && event.target instanceof Element)
          clear(event.target);
      },
      options,
    );
    this.document.addEventListener(
      "pointercancel",
      (event) => {
        if (event.target instanceof Element) {
          const button = event.target.closest(BUTTONS);
          if (button) clear(button);
        }
      },
      options,
    );
    this.destroyRef.onDestroy(() => {
      controller.abort();
      for (const button of timers.keys()) clear(button);
    });
  }
}

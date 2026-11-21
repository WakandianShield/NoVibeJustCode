import { signal } from "@angular/core";

function errorText(error: any): string {
  return (
    error?.error?.error ||
    error?.message ||
    "No se pudo completar la operación."
  );
}

export class Page {
  readonly error = signal("");
  readonly busy = signal(false);
  readonly notice = signal("");

  async task<T>(action: () => Promise<T>): Promise<T | undefined> {
    this.error.set("");
    this.notice.set("");
    this.busy.set(true);

    try {
      return await action();
    } catch (error) {
      this.error.set(errorText(error));
      return undefined;
    } finally {
      this.busy.set(false);
    }
  }
}

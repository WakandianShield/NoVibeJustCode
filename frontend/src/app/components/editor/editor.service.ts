import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class EditorService {
  language(name: string): string {
    const extension = name.split(".").pop();
    return (
      (
        {
          py: "python",
          ts: "typescript",
          js: "javascript",
          mjs: "javascript",
          html: "html",
          css: "css",
          json: "json",
          md: "markdown",
        } as Record<string, string>
      )[extension || ""] || "plaintext"
    );
  }
}

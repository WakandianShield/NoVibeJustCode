import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class HomeService {
  readonly languages = [
    { id_curso: 1, titulo: "Python" },
    { id_curso: 2, titulo: "JavaScript" },
    { id_curso: 3, titulo: "HTML y CSS" },
    { id_curso: 4, titulo: "TypeScript" },
    { id_curso: 5, titulo: "Node.js" },
  ];
  readonly logos = [
    ["/python-logo.webp"],
    ["/js-logo.webp"],
    ["/html-logo.webp", "/css-logo.webp"],
    ["/ts-logo.webp"],
    ["/nodejs-logo.webp"],
  ];
}

import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  ElementRef,
  ViewChild,
  signal,
  inject,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

import { EditorService } from "./editor.service";

declare const window: any;

@Component({
  selector: "nv-editor",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./editor.component.html",
  styleUrl: "./editor.component.css",
})
export class EditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  editorService = inject(EditorService);
  @Input() readOnly = false;
  @Input() files: Record<string, string> = {};
  @Output() filesChange = new EventEmitter<Record<string, string>>();
  @ViewChild("host") host!: ElementRef;
  active = "";
  enhanced = signal(false);
  editor: any;
  listener: any;
  destroyed = false;
  switching = false;
  get names() {
    if (!this.active || !Object.hasOwn(this.files, this.active))
      this.active = Object.keys(this.files)[0] || "";
    return Object.keys(this.files);
  }
  async ngAfterViewInit() {
    this.active = this.names[0] || "";
    if (matchMedia("(pointer:coarse)").matches) return;
    try {
      if (!window.require) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "/monaco/vs/loader.js";
          s.onload = () => resolve();
          s.onerror = reject;
          document.head.append(s);
        });
      }
      if (this.destroyed) return;
      window.require.config({ paths: { vs: "/monaco/vs" } });
      await new Promise<void>((resolve, reject) =>
        window.require(["vs/editor/editor.main"], resolve, reject),
      );
      if (this.destroyed) return;
      this.editor = window.monaco.editor.create(this.host.nativeElement, {
        value: this.files[this.active] || "",
        language: this.language(this.active),
        theme: "vs-dark",
        readOnly: this.readOnly,
        fontSize: 15,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
      });
      this.listener = this.editor.onDidChangeModelContent(() => {
        if (!this.switching) this.changed(this.editor.getValue());
      });
      this.enhanced.set(true);
      setTimeout(() => this.editor?.layout(), 0);
    } catch {
      this.enhanced.set(false);
    }
  }
  language(name: string) {
    return this.editorService.language(name);
  }
  select(name: string) {
    this.active = name;
    if (this.editor) {
      this.switching = true;
      this.editor.setValue(this.files[name] || "");
      window.monaco.editor.setModelLanguage(
        this.editor.getModel(),
        this.language(name),
      );
      this.switching = false;
    }
  }
  changed(value: string) {
    this.files = { ...this.files, [this.active]: value };
    this.filesChange.emit(this.files);
  }
  ngOnChanges() {
    this.names;
    this.editor?.updateOptions({ readOnly: this.readOnly });
    if (
      this.editor &&
      this.editor.getValue() !== (this.files[this.active] || "")
    ) {
      this.switching = true;
      this.editor.setValue(this.files[this.active] || "");
      window.monaco.editor.setModelLanguage(
        this.editor.getModel(),
        this.language(this.active),
      );
      this.switching = false;
    }
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.listener?.dispose();
    this.editor?.dispose();
  }
}

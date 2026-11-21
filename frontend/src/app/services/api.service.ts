import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T = any>(path: string) {
    return firstValueFrom(this.http.get<T>(`/api${path}`));
  }

  post<T = any>(path: string, body: any = {}) {
    return firstValueFrom(this.http.post<T>(`/api${path}`, body));
  }

  patch<T = any>(path: string, body: any) {
    return firstValueFrom(this.http.patch<T>(`/api${path}`, body));
  }

  delete<T = any>(path: string, body?: any) {
    return firstValueFrom(this.http.delete<T>(`/api${path}`, { body }));
  }
}

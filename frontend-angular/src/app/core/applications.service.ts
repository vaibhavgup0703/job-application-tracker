// All HTTP calls for job applications. Components never build URLs themselves.
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApplicationInput, ApplicationQuery, JobApplication, PagedResult, Stats } from './models';

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/applications`;

  // Observables are LAZY: nothing is sent until a component calls .subscribe().
  list(query: ApplicationQuery): Observable<PagedResult<JobApplication>> {
    // HttpParams builds "?status=Applied&page=2" safely (URL-encoding included).
    let params = new HttpParams();
    // Object.entries -> [key, value] pairs, like iterating a std::map.
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
      // HttpParams is immutable: set() returns a NEW object, so we reassign.
    }
    return this.http.get<PagedResult<JobApplication>>(this.base, { params });
  }

  get(id: number): Observable<JobApplication> {
    return this.http.get<JobApplication>(`${this.base}/${id}`);
  }

  create(input: ApplicationInput): Observable<JobApplication> {
    return this.http.post<JobApplication>(this.base, input);
  }

  update(id: number, input: ApplicationInput): Observable<JobApplication> {
    return this.http.put<JobApplication>(`${this.base}/${id}`, input);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  stats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.base}/stats`);
  }
}

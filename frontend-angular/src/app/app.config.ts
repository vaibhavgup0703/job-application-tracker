// App-wide providers = Angular's version of builder.Services in Program.cs.
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()), // route params (:id) arrive as component inputs
    provideHttpClient(withInterceptors([authInterceptor])), // every HTTP call passes through authInterceptor
  ],
};

// HTTP INTERCEPTOR: runs on EVERY request and response, the frontend's version of middleware.
// 1) Adds "Authorization: Bearer <token>" so the backend knows who we are.
// 2) If the backend answers 401 (token expired/invalid), log out and go to the login page.
// Real-life example: an office receptionist who stamps every outgoing letter with the company seal.
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  // Requests are immutable, so clone() makes a modified copy (like copying a const object).
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/auth/register');
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthCall) {
        auth.logout();
      }
      return throwError(() => err); // re-throw so the calling component can still react
    }),
  );
};

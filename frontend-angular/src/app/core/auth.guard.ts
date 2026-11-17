// ROUTE GUARDS: decide whether a page may open. Like a bouncer at a club door.
// Returning true lets you in; returning a UrlTree redirects you elsewhere.
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Only logged-in users. Others are sent to /login.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

// Only logged-OUT users (login/register pages). Logged-in users go to the dashboard.
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree(['/dashboard']) : true;
};

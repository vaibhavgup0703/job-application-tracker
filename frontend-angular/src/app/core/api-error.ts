// Turns an HTTP error into a message (and field errors) the UI can show.
import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './models';

export function readApiError(err: unknown): { message: string; fields: Record<string, string> } {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return { message: 'Cannot reach the API. Is a backend running on port 5000?', fields: {} };
    const body = err.error as Partial<ApiError> | null;
    return { message: body?.error ?? `Request failed (${err.status}).`, fields: body?.details ?? {} };
  }
  return { message: 'Unexpected error.', fields: {} };
}

// TypeScript types matching the API's JSON (see the API contract in README.md).
// `interface`/`type` exist only at compile time, like C++ structs used purely for type checking.

export const STATUSES = ['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected'] as const;
// `as const` makes this a fixed tuple of exact strings, so the next line can derive a union type.
export type ApplicationStatus = (typeof STATUSES)[number]; // 'Wishlist' | 'Applied' | ...

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface JobApplication {
  id: number;
  company: string;
  role: string;
  status: ApplicationStatus;
  location: string | null;
  salaryLpa: number | null;
  jobUrl: string | null;
  appliedOn: string | null; // "yyyy-MM-dd"
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Body for create/update: everything except server-owned fields.
// Omit<T, keys> = "T without these fields". Built-in "utility type".
export type ApplicationInput = Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>;

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApplicationQuery {
  status?: ApplicationStatus | '';
  search?: string;
  sort?: 'updatedAt' | 'appliedOn' | 'company';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface Stats {
  total: number;
  byStatus: Record<ApplicationStatus, number>; // Record<K, V> = an object used like std::map<K, V>
  responseRatePercent: number;
}

// Shape of the API's error responses: { error, details?: { field: message } }
export interface ApiError {
  error: string;
  details?: Record<string, string>;
}

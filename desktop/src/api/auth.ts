import { request } from './http';

export type UserRole = 'CUSTOMER' | 'ADMIN';
export type BodyBuild = 'SLIM' | 'REGULAR' | 'ATHLETIC' | 'PLUS';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface SessionResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: SessionUser;
}

export interface Profile extends SessionUser {
  heightCm: number | null;
  build: BodyBuild | null;
  usualSize: string | null;
}

export interface ProfileUpdate {
  heightCm: number | null;
  build: BodyBuild | null;
  usualSize: string | null;
}

export function login(email: string, password: string): Promise<SessionResponse> {
  return request('POST', '/api/v1/auth/login', { body: { email, password } });
}

export function register(fullName: string, email: string, password: string): Promise<SessionResponse> {
  return request('POST', '/api/v1/auth/register', { body: { fullName, email, password } });
}

export function refresh(refreshToken: string): Promise<SessionResponse> {
  return request('POST', '/api/v1/auth/refresh', { body: { refreshToken } });
}

export function logout(refreshToken: string): Promise<unknown> {
  return request('POST', '/api/v1/auth/logout', { body: { refreshToken } });
}

export function fetchProfile(signal?: AbortSignal): Promise<Profile> {
  return request('GET', '/api/v1/me', { auth: true, signal });
}

export function updateProfile(update: ProfileUpdate): Promise<Profile> {
  return request('PUT', '/api/v1/me', { auth: true, body: update });
}

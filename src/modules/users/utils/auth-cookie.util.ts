import type { Response } from 'express';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
} from '../constants/auth-cookie.constants';

const isProduction = process.env.NODE_ENV === 'production';

export const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookies(
  response: Response,
  session: {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
  },
) {
  response.cookie(AUTH_ACCESS_COOKIE, session.access_token, {
    ...authCookieOptions,
    maxAge: (session.expires_in ?? 3600) * 1000,
  });

  response.cookie(AUTH_REFRESH_COOKIE, session.refresh_token, {
    ...authCookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(response: Response) {
  response.clearCookie(AUTH_ACCESS_COOKIE, authCookieOptions);
  response.clearCookie(AUTH_REFRESH_COOKIE, authCookieOptions);
}

export function parseCookieHeader(
  cookieHeader?: string,
): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader
    .split(';')
    .reduce<Record<string, string>>((cookies, part) => {
      const [rawName, ...rawValue] = part.trim().split('=');
      if (!rawName || rawValue.length === 0) return cookies;

      cookies[rawName] = decodeURIComponent(rawValue.join('='));
      return cookies;
    }, {});
}

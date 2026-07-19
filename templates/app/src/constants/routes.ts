/**
 * Every route string in the app. Never hardcode a path in `<Link href>`,
 * `router.push`, or `redirect()` — import from here so a route rename is one
 * edit and `codeable-web doctor` can verify pages ↔ constants stay in sync.
 */

export const AUTH_ROUTES = {
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
} as const;

export const APP_ROUTES = {
  dashboard: "/dashboard",
  orders: "/orders",
  settings: "/settings",
  // codeable-web:routes — the `domain` generator appends new routes here.
} as const;

export const ROUTES = { ...AUTH_ROUTES, ...APP_ROUTES } as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/** Where a signed-in user lands by default. */
export const DEFAULT_AUTHED_ROUTE = APP_ROUTES.dashboard;

/** Where an unauthenticated visitor is sent. */
export const DEFAULT_GUEST_ROUTE = AUTH_ROUTES.login;

/** Routes reachable without a session (checked by middleware). */
export const PUBLIC_ROUTES: readonly string[] = Object.values(AUTH_ROUTES);

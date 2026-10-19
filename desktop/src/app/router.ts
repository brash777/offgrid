import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'catalog'; category?: string; search?: string }
  | { name: 'product'; id: string }
  | { name: 'login'; next?: string }
  | { name: 'register'; next?: string; email?: string }
  | { name: 'account' }
  | { name: 'checkout' }
  | { name: 'order'; id: string; placed?: boolean }
  | { name: 'notFound' };

const AUTH_PATHS = ['#/login', '#/register'];

function safeNext(value: string | null): string | undefined {
  if (!value || !value.startsWith('#/') || AUTH_PATHS.some((path) => value.startsWith(path))) {
    return undefined;
  }
  return value;
}

function withNext(path: string, next?: string): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

export function parseHash(hash: string): Route {
  const [rawPath, rawQuery = ''] = hash.replace(/^#/, '').split('?');
  const segments = rawPath.split('/').filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(rawQuery);

  if (segments.length === 0) {
    return { name: 'home' };
  }
  if (segments[0] === 'catalog' && segments.length === 1) {
    return {
      name: 'catalog',
      category: query.get('category') ?? undefined,
      search: query.get('search') ?? undefined,
    };
  }
  if (segments[0] === 'product' && segments.length === 2) {
    return { name: 'product', id: segments[1] };
  }
  if (segments[0] === 'login' && segments.length === 1) {
    return { name: 'login', next: safeNext(query.get('next')) };
  }
  if (segments[0] === 'register' && segments.length === 1) {
    return { name: 'register', next: safeNext(query.get('next')), email: query.get('email') ?? undefined };
  }
  if (segments[0] === 'account' && segments.length === 1) {
    return { name: 'account' };
  }
  if (segments[0] === 'checkout' && segments.length === 1) {
    return { name: 'checkout' };
  }
  if (segments[0] === 'orders' && segments.length === 2) {
    return { name: 'order', id: segments[1], placed: query.get('placed') === '1' };
  }
  return { name: 'notFound' };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'catalog': {
      const query = new URLSearchParams();
      if (route.category) {
        query.set('category', route.category);
      }
      if (route.search) {
        query.set('search', route.search);
      }
      const suffix = query.toString();
      return suffix ? `#/catalog?${suffix}` : '#/catalog';
    }
    case 'product':
      return `#/product/${encodeURIComponent(route.id)}`;
    case 'login':
      return withNext('#/login', route.next);
    case 'register': {
      const query = new URLSearchParams();
      if (route.next) {
        query.set('next', route.next);
      }
      if (route.email) {
        query.set('email', route.email);
      }
      const suffix = query.toString();
      return suffix ? `#/register?${suffix}` : '#/register';
    }
    case 'account':
      return '#/account';
    case 'checkout':
      return '#/checkout';
    case 'order':
      return `#/orders/${encodeURIComponent(route.id)}${route.placed ? '?placed=1' : ''}`;
    case 'notFound':
      return '#/not-found';
  }
}

export function currentHref(): string {
  return window.location.hash || hrefFor({ name: 'home' });
}

export function navigate(route: Route, options: { replace?: boolean } = {}) {
  navigateTo(hrefFor(route), options);
}

export function navigateTo(href: string, options: { replace?: boolean } = {}) {
  if (options.replace) {
    window.history.replaceState(null, '', href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = href;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handleChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', handleChange);
    return () => window.removeEventListener('hashchange', handleChange);
  }, []);

  return route;
}

export function routeKey(route: Route): string {
  return route.name === 'catalog' ? 'catalog' : hrefFor(route);
}

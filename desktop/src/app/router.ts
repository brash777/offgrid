import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'catalog'; category?: string; search?: string }
  | { name: 'product'; id: string }
  | { name: 'notFound' };

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
    case 'notFound':
      return '#/not-found';
  }
}

export function navigate(route: Route, options: { replace?: boolean } = {}) {
  const href = hrefFor(route);
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

export const SEARCH_FOCUS_EVENT = 'flowstore:focus-search';

let pending = false;

export function requestSearchFocus() {
  pending = true;
  window.dispatchEvent(new Event(SEARCH_FOCUS_EVENT));
}

export function consumeSearchFocus(): boolean {
  const wasPending = pending;
  pending = false;
  return wasPending;
}

const DATE_TIME = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

export function formatDateTime(value: string): string {
  return DATE_TIME.format(new Date(value));
}

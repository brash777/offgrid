const photos = import.meta.glob<string>('../assets/studio/*.webp', { eager: true, import: 'default' });

export function studioPhoto(name: string): string | undefined {
  return photos[`../assets/studio/${name}.webp`];
}

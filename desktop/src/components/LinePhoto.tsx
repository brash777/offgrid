import type { GarmentSpec } from '../lib/garments';
import { GarmentArt } from './garment/GarmentArt';
import { ProductPhoto } from './ProductPhoto';

interface LinePhotoProps {
  thumbnailUrl: string | null;
  photoColor: string | null;
  photoColorHex: string | null;
  colorName: string;
  colorHex: string;
  fallback: GarmentSpec;
}

export function LinePhoto({ thumbnailUrl, photoColor, photoColorHex, colorName, colorHex, fallback }: LinePhotoProps) {
  if (!thumbnailUrl) {
    return <GarmentArt kind={fallback.kind} print={fallback.print} color={colorHex} />;
  }
  const colors = [
    ...(photoColor && photoColorHex ? [{ name: photoColor, hex: photoColorHex }] : []),
    { name: colorName, hex: colorHex },
  ];
  return (
    <ProductPhoto src={thumbnailUrl} alt="" photoColor={photoColor} colors={colors} activeColor={colorName} />
  );
}

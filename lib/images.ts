import imageManifest from "@/data/image-manifest.json";

type ImageManifest = Record<string, string[]>;

const imageMap = imageManifest as ImageManifest;

export function getImagesByDate(date: string): string[] {
  return imageMap[date] ?? [];
}

export function getAllDates(): string[] {
  return Object.keys(imageMap).sort();
}

const imageMap: Record<string, string[]> = {
  "2026-03-20": [
    "/images/2026-03-20/image-1.jpg",
    "/images/2026-03-20/image-2.jpg",
    "/images/2026-03-20/image-3.jpg",
  ],
  "2026-03-21": [
    "/images/2026-03-21/3eeffdd94e6c2d00da6d19a550d9b3ae.jpg",
    "/images/2026-03-21/43eeb42a38759c1727fbbf5793f38821.jpg",
    "/images/2026-03-21/b30381279db41e04026b2b59b29f5a7e.jpg",
    "/images/2026-03-21/bdfc7beece7f2433a1267278c2a6f2fb.jpg",
  ],
  "2026-03-22": [
    "/images/2026-03-22/02fa8d13b005a8fabfeb616e358ec3ef.jpg",
    "/images/2026-03-22/213a09c39132b9b631806b11ae73d7f0.jpg",
  ],
  "2026-04-12": [
    "/images/2026-04-12/2baf9cf67ca061e0b9a09b4c620accb2.jpg",
    "/images/2026-04-12/4f3a01847852f4d027aae0fc0279fe09.jpg",
    "/images/2026-04-12/9c7d564abbfeae394f918f6254d00d69.jpg",
  ],
};

export function getImagesByDate(date: string): string[] {
  return imageMap[date] ?? [];
}

export function getAllDates(): string[] {
  return Object.keys(imageMap).sort();
}

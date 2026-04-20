import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/site-settings';

const PUBLIC_KEYS = [
  'site_name',
  'love_start_date',
  'love_start_date_label',
  'person_a_name',
  'person_b_name',
  'avatar_a',
  'avatar_b',
];

/** GET /api/site-info — 公开接口，返回前台展示所需的站点信息 */
export async function GET() {
  const settings = await getSettings(PUBLIC_KEYS);
  return NextResponse.json(settings, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
  });
}

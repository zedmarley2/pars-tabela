import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Cache for 60 seconds
export const revalidate = 60;

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    const grouped: Record<string, Record<string, string>> = {};
    for (const setting of settings) {
      if (!grouped[setting.group]) {
        grouped[setting.group] = {};
      }
      grouped[setting.group][setting.key] = setting.value;
    }

    return NextResponse.json({ data: grouped }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('Error fetching public settings:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

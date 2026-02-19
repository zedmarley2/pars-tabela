import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/settings
 * Get all settings grouped by the `group` field.
 * Returns: { data: Record<string, Record<string, string>> }
 */
export async function GET() {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const settings = await prisma.siteSettings.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    // Group settings by their group field
    const grouped: Record<string, Record<string, string>> = {};
    for (const setting of settings) {
      if (!grouped[setting.group]) {
        grouped[setting.group] = {};
      }
      grouped[setting.group][setting.key] = setting.value;
    }

    return NextResponse.json({ data: grouped });
  } catch (err) {
    console.error('Error fetching settings:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings
 * Bulk update settings.
 * Body: { settings: { key: string, value: string, group: string }[] }
 * Upserts each setting by key.
 */
export async function PUT(request: NextRequest) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const body = await request.json();

    if (!body.settings || !Array.isArray(body.settings)) {
      return NextResponse.json(
        { error: 'Request body must include a settings array' },
        { status: 400 }
      );
    }

    // Validate each setting entry
    for (const setting of body.settings) {
      if (
        typeof setting.key !== 'string' ||
        typeof setting.value !== 'string' ||
        typeof setting.group !== 'string'
      ) {
        return NextResponse.json(
          { error: 'Each setting must have key (string), value (string), and group (string)' },
          { status: 400 }
        );
      }
    }

    // Upsert each setting in a transaction
    const results = await prisma.$transaction(
      body.settings.map(
        (setting: { key: string; value: string; group: string }) =>
          prisma.siteSettings.upsert({
            where: { key: setting.key },
            update: {
              value: setting.value,
              group: setting.group,
            },
            create: {
              key: setting.key,
              value: setting.value,
              group: setting.group,
            },
          })
      )
    );

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error('Error updating settings:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

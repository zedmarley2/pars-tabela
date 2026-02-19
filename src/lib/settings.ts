import prisma from '@/lib/prisma';

export type SettingsMap = Record<string, string>;
export type GroupedSettings = Record<string, SettingsMap>;

/**
 * Get all site settings, grouped by group name.
 */
export async function getAllSettings(): Promise<GroupedSettings> {
  const rows = await prisma.siteSettings.findMany();
  const grouped: GroupedSettings = {};
  for (const row of rows) {
    if (!grouped[row.group]) grouped[row.group] = {};
    grouped[row.group][row.key] = row.value;
  }
  return grouped;
}

/**
 * Get settings for a specific group.
 */
export async function getSettingsByGroup(group: string): Promise<SettingsMap> {
  const rows = await prisma.siteSettings.findMany({ where: { group } });
  const map: SettingsMap = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

/**
 * Get a single setting value.
 */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.siteSettings.findUnique({ where: { key } });
  return row?.value ?? null;
}

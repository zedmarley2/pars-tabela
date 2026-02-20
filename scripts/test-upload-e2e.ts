/**
 * End-to-end test for the upload + media flow.
 * Simulates the full upload pipeline: file write + Media DB record creation,
 * then tests the media query/search/delete operations.
 *
 * Usage: npx tsx scripts/test-upload-e2e.ts
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { writeFile, mkdir, unlink, access } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/pars_tabela',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await access(filepath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n=== Upload + Media E2E Tests ===\n');

  // Simulate the upload route logic
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const originalFilename = 'e2e-test-photo.png';
  const mimetype = 'image/png';
  const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.png`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  const filePath = path.join(uploadDir, uniqueName);
  const url = `/uploads/${uniqueName}`;

  // 1) Write file to disk (like upload route does)
  console.log('1) Write file to disk');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, pngBuffer);
  assert(await fileExists(filePath), `File written: ${uniqueName}`);

  // 2) Create Media record (like upload route does)
  console.log('\n2) Create Media record in DB');
  const media = await prisma.media.create({
    data: {
      filename: originalFilename,
      path: filePath,
      url,
      mimetype,
      size: pngBuffer.length,
      width: 1,
      height: 1,
    },
  });
  assert(!!media.id, `Media record created: ${media.id}`);
  assert(media.filename === originalFilename, `Filename: ${media.filename}`);
  assert(media.mimetype === 'image/png', `Mimetype: ${media.mimetype}`);
  assert(media.size === pngBuffer.length, `Size: ${media.size}`);
  assert(media.url === url, `URL: ${media.url}`);
  assert(media.path === filePath, `Path stored correctly`);

  // 3) Query media list (like GET /api/admin/media)
  console.log('\n3) Query media list with pagination');
  const allMedia = await prisma.media.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const total = await prisma.media.count();
  assert(allMedia.length >= 1, `Found ${allMedia.length} media items`);
  assert(total >= 1, `Total count: ${total}`);
  const foundItem = allMedia.find(m => m.id === media.id);
  assert(!!foundItem, 'Uploaded item appears in list');
  assert(foundItem!.filename === originalFilename, 'List item has correct filename');
  assert(foundItem!.size === pngBuffer.length, 'List item has correct size');

  // 4) Search by filename (like GET /api/admin/media?search=...)
  console.log('\n4) Search by filename');
  const searchResults = await prisma.media.findMany({
    where: {
      OR: [
        { filename: { contains: 'e2e-test', mode: 'insensitive' } },
        { url: { contains: 'e2e-test', mode: 'insensitive' } },
      ],
    },
  });
  assert(searchResults.length >= 1, `Search found ${searchResults.length} result(s)`);

  // 5) Delete media record + file (like DELETE /api/admin/media)
  console.log('\n5) Delete media (DB record + file)');
  const existing = await prisma.media.findUnique({ where: { id: media.id } });
  assert(existing !== null, 'Record exists before delete');

  // Delete file from disk
  try {
    await unlink(existing!.path);
  } catch {
    // ignore
  }
  // Delete DB record
  await prisma.media.delete({ where: { id: media.id } });

  const afterDelete = await prisma.media.findUnique({ where: { id: media.id } });
  assert(afterDelete === null, 'DB record deleted');
  assert(!(await fileExists(filePath)), 'File removed from disk');

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  await prisma.$disconnect();
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

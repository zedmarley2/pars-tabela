/**
 * Integration test for the Media model.
 * Tests CRUD operations directly against the database.
 *
 * Usage: npx tsx scripts/test-media.ts
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

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

async function main() {
  console.log('\n=== Media Model Integration Tests ===\n');

  // 1. CREATE
  console.log('1) Create a Media record');
  const created = await prisma.media.create({
    data: {
      filename: 'test-image.png',
      path: '/tmp/test-image.png',
      url: '/uploads/test-image.png',
      mimetype: 'image/png',
      size: 12345,
      width: 800,
      height: 600,
    },
  });
  assert(!!created.id, 'Record created with id: ' + created.id);
  assert(created.filename === 'test-image.png', 'Filename matches');
  assert(created.mimetype === 'image/png', 'Mimetype matches');
  assert(created.size === 12345, 'Size matches');
  assert(created.width === 800, 'Width matches');
  assert(created.height === 600, 'Height matches');
  assert(!!created.createdAt, 'createdAt is set');

  // 2. READ (findUnique)
  console.log('\n2) Read the Media record by id');
  const found = await prisma.media.findUnique({ where: { id: created.id } });
  assert(found !== null, 'Record found');
  assert(found!.url === '/uploads/test-image.png', 'URL matches');

  // 3. READ (findMany with search)
  console.log('\n3) Search Media records by filename');
  const searchResults = await prisma.media.findMany({
    where: {
      filename: { contains: 'test-image', mode: 'insensitive' },
    },
  });
  assert(searchResults.length >= 1, `Found ${searchResults.length} result(s)`);

  // 4. CREATE without optional fields
  console.log('\n4) Create Media record without width/height');
  const noSize = await prisma.media.create({
    data: {
      filename: 'test-doc.webp',
      path: '/tmp/test-doc.webp',
      url: '/uploads/test-doc.webp',
      mimetype: 'image/webp',
      size: 5678,
    },
  });
  assert(noSize.width === null, 'Width is null when not provided');
  assert(noSize.height === null, 'Height is null when not provided');

  // 5. COUNT
  console.log('\n5) Count Media records');
  const count = await prisma.media.count();
  assert(count >= 2, `Count is ${count} (>= 2)`);

  // 6. DELETE
  console.log('\n6) Delete Media records');
  await prisma.media.delete({ where: { id: created.id } });
  await prisma.media.delete({ where: { id: noSize.id } });
  const afterDelete = await prisma.media.findUnique({ where: { id: created.id } });
  assert(afterDelete === null, 'Record deleted successfully');

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

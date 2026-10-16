import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring database schema is up-to-date (non-destructive, zero data loss)...');
  try {
    // Adds preferences column to User table if it does not already exist
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferences" JSONB;'
    );
    console.log('✅ Column "User.preferences" verified/created successfully with zero data loss.');

    // Populate default preferences for any existing accounts with NULL preferences
    const defaultJson = JSON.stringify({
      defaultView: 'TABLE',
      defaultStatusFilter: 'ALL',
      tableDensity: 'normal',
      density: 'normal',
      visibleWidgets: ['PENDING', 'TODAY', 'URGENT', 'WEEKLY'],
      visibleColumns: {
        department: true,
        studentId: true,
        reason: true,
        approvedBy: true,
      },
    });

    const updatedCount = await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "preferences" = $1::jsonb WHERE "preferences" IS NULL;`,
      defaultJson
    );
    console.log(`✅ Populated default preferences for ${updatedCount} admin accounts in database.`);

  } catch (err: any) {
    console.error('Failed to run migration:', err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

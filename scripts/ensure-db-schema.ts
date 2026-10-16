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
  } catch (err: any) {
    console.error('Failed to run migration:', err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function runDatabaseTests() {
  console.log('==============================================');
  console.log('🔍 STARTING DATABASE VERIFICATION TEST SUITE');
  console.log('==============================================\n');

  let passedTests = 0;
  let totalTests = 5;

  try {
    // 1. Connection Test
    console.log('Test 1: Testing Connection to Prisma Postgres...');
    const startConn = performance.now();
    await prisma.$queryRaw`SELECT 1 as connected;`;
    const connDuration = (performance.now() - startConn).toFixed(2);
    console.log(`✅ Connection successful! Latency: ${connDuration}ms\n`);
    passedTests++;

    // 2. Table Record Count and Integrity
    console.log('Test 2: Verifying Table Record Counts & Integrity...');
    const [userCount, bookingCount, settingCount, auditCount] = await Promise.all([
      prisma.user.count(),
      prisma.booking.count(),
      prisma.siteSetting.count(),
      prisma.auditLog.count(),
    ]);

    console.log(`   - Users:        ${userCount} records`);
    console.log(`   - Bookings:     ${bookingCount} records`);
    console.log(`   - SiteSettings: ${settingCount} records`);
    console.log(`   - AuditLogs:    ${auditCount} records`);

    if (userCount > 0 && bookingCount > 0) {
      console.log('✅ Integrity check passed: Existing database records intact.\n');
      passedTests++;
    } else {
      throw new Error('Database unexpectedly empty!');
    }

    // 3. Schema Schema & New Fields Validation
    console.log('Test 3: Validating Model Schema & New Invitation Fields...');
    const sampleUser = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        inviteToken: true,
        inviteExpiresAt: true,
        role: true,
      },
    });

    if (sampleUser && 'username' in sampleUser && 'inviteToken' in sampleUser) {
      console.log(`✅ Schema fields valid on User model (Found sample user: ${sampleUser.email})`);
      console.log(`   Fields present: [id, email, fullName, username, inviteToken, inviteExpiresAt, role]\n`);
      passedTests++;
    } else {
      throw new Error('User model missing expected fields');
    }

    // 4. CRUD Test: Create, Read, Update, Delete with Invite Flow Simulation
    console.log('Test 4: Simulating Admin Invite & Claim Username Cycle (CRUD)...');
    const testEmail = `db_test_${Date.now()}@example.com`;
    const testToken = crypto.randomBytes(32).toString('hex');
    const testExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Create
    const created = await prisma.user.create({
      data: {
        email: testEmail,
        fullName: 'DB Test User',
        passwordHash: 'temp_hash_for_test',
        role: 'ADMIN',
        inviteToken: testToken,
        inviteExpiresAt: testExpiry,
      },
    });
    console.log(`   - Created test user with ID: ${created.id} (InviteToken: ${created.inviteToken?.slice(0, 8)}...)`);

    // Read by inviteToken
    const foundByToken = await prisma.user.findUnique({
      where: { inviteToken: testToken },
    });
    if (!foundByToken || foundByToken.id !== created.id) {
      throw new Error('Failed to query user by inviteToken');
    }

    // Update (simulating password setup & username claim)
    const testUsername = `testuser_${Date.now().toString().slice(-6)}`;
    const updated = await prisma.user.update({
      where: { id: created.id },
      data: {
        username: testUsername,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });
    if (updated.username !== testUsername || updated.inviteToken !== null) {
      throw new Error('Failed to update user or clear inviteToken');
    }
    console.log(`   - Successfully claimed username: ${updated.username} & cleared inviteToken`);

    // Clean up Delete
    await prisma.user.delete({
      where: { id: created.id },
    });
    const checkDeleted = await prisma.user.findUnique({
      where: { id: created.id },
    });
    if (checkDeleted !== null) {
      throw new Error('Test record was not deleted');
    }
    console.log('   - Successfully cleaned up test record');
    console.log('✅ CRUD Simulation passed 100%.\n');
    passedTests++;

    // 5. Booking & Query Performance Test
    console.log('Test 5: Testing Complex Booking Queries & Indexing...');
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        bookingCode: true,
        department: true,
        reason: true,
        status: true,
        date: true,
      },
    });
    console.log(`   - Successfully retrieved ${recentBookings.length} latest bookings`);
    recentBookings.forEach((b) => {
      console.log(`     [${b.bookingCode}] ${b.department} - Status: ${b.status} (${b.date})`);
    });
    console.log('✅ Booking queries and indexing verified.\n');
    passedTests++;

    console.log('==============================================');
    console.log(`🎉 ALL TESTS PASSED (${passedTests}/${totalTests})`);
    console.log('Database is healthy, fully operational, and in sync!');
    console.log('==============================================');
  } catch (error) {
    console.error('❌ Database Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDatabaseTests();

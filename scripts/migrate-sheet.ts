import readline from 'readline';
import { migrateSheetHistory, MigrationMode } from '../src/lib/sheet-migration';
import { prisma } from '../src/lib/prisma';

async function promptMode(): Promise<MigrationMode> {
  const args = process.argv.slice(2);
  const modeArg = args.find((a) => a.startsWith('--mode='));
  if (modeArg) {
    const val = modeArg.split('=')[1]?.toLowerCase();
    if (val === 'add' || val === 'append') return 'add';
    if (val === 'overwrite' || val === 'update') return 'overwrite';
  }

  // If running in non-interactive environment (CI / pipe)
  if (!process.stdin.isTTY) {
    return 'overwrite';
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('\n📋 กรุณาเลือกรูปแบบการนำเข้าข้อมูลประวัติจากชีต (Migration Mode):');
    console.log('   [1] เขียนทับข้อมูลเดิม (Overwrite) — อัปเดตข้อมูลรายการเดิมให้ตรงกับชีต และเพิ่มรายการใหม่');
    console.log('   [2] เพิ่มเฉพาะรายการใหม่ (Add into) — ข้ามรายการที่มีอยู่ในระบบแล้ว และเพิ่มเฉพาะรายการใหม่');
    rl.question('\n👉 กรุณาพิมพ์ 1 หรือ 2 (ค่าเริ่มต้นคือ 1): ', (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed === '2' || trimmed.toLowerCase() === 'add') {
        resolve('add');
      } else {
        resolve('overwrite');
      }
    });
  });
}

async function run() {
  try {
    const mode = await promptMode();

    console.log(`\n🚀 เริ่มต้นการนำเข้าข้อมูลประวัติการจองจากโฟลเดอร์ sheetexample (โหมด: ${mode.toUpperCase()})...`);

    const startTime = Date.now();
    const result = await migrateSheetHistory({ mode });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ การนำเข้าข้อมูลเสร็จสมบูรณ์!');
    console.log(`📊 สรุปผลการประมวลผล (${duration} วินาที) [โหมด: ${result.mode}]:`);
    console.log(`   - จำนวนแถวทั้งหมดในไฟล์: ${result.totalRows}`);
    console.log(`   - นำเข้าใหม่สำเร็จ: ${result.imported}`);
    console.log(`   - อัปเดตรายการเดิม (Overwrite): ${result.updated}`);
    console.log(`   - ข้ามรายการเดิม (Skipped): ${result.skipped}`);

    if (result.errors.length > 0) {
      console.warn(`\n⚠️ เกิดข้อผิดพลาดใน ${result.errors.length} แถว:`);
      for (const err of result.errors) {
        console.warn(`   - แถว ${err.row}: ${err.error}`);
      }
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการประมวลผล:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

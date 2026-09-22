import { PrismaClient, Role, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || 'ChangeMeImmediately123!';
  const superAdminPassword = await bcrypt.hash(defaultPassword, 10);
  const adminPassword = await bcrypt.hash(defaultPassword, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@kmutnb.ac.th' },
    update: {},
    create: {
      email: 'admin@kmutnb.ac.th',
      fullName: 'ผู้ดูแลระบบหลัก (Super Admin)',
      passwordHash: superAdminPassword,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  const staffAdmin = await prisma.user.upsert({
    where: { email: 'staff@kmutnb.ac.th' },
    update: {},
    create: {
      email: 'staff@kmutnb.ac.th',
      fullName: 'เจ้าหน้าที่สภานักศึกษา',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const defaultSettings = [
    { key: 'site_title', value: 'สภานักศึกษา มจพ.', description: 'ชื่อระบบ' },
    { key: 'site_subtitle', value: 'Student Parliament KMUTNB', description: 'คำบรรยายย่อย' },
    { key: 'hero_title', value: 'ยินดีต้อนรับสู่เว็บไซต์สภานักศึกษา มจพ.', description: 'หัวข้อหน้าแรก' },
    { key: 'hero_description', value: 'ศูนย์รวมข้อมูลข่าวสาร การจองห้องประชุม และช่องทางการติดต่อสื่อสารเพื่อชาว มจพ.', description: 'คำอธิบายหน้าแรก' },
    { key: 'social_facebook', value: 'https://www.facebook.com', description: 'ลิงก์ Facebook' },
    { key: 'social_facebook_title', value: 'สภานักศึกษา มจพ.', description: 'ชื่อแสดง Facebook' },
    { key: 'social_instagram', value: 'https://www.instagram.com', description: 'ลิงก์ Instagram' },
    { key: 'social_instagram_title', value: '@kmutnb_parliament', description: 'ชื่อแสดง Instagram' },
    { key: 'social_tiktok', value: 'https://www.tiktok.com', description: 'ลิงก์ TikTok' },
    { key: 'social_tiktok_title', value: 'สภานักศึกษา มจพ.', description: 'ชื่อแสดง TikTok' },
    { key: 'complaint_url', value: 'https://forms.gle/your-google-form-link', description: 'ลิงก์ Google Form รับเรื่องร้องเรียน' },
    { key: 'rules_content', value: '1. ห้ามนำอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) เข้ามารับประทานในห้องประชุมเด็ดขาด\n2. ช่วยกันรักษาความสะอาด ปิดไฟ และเครื่องปรับอากาศทุกครั้งหลังใช้งานเสร็จ\n⚠️ คำเตือน: หากทำผิดกฎระเบียบ ท่านจะไม่สามารถจองห้องประชุมได้อีกเป็นเวลา 2 เดือนเต็ม', description: 'กฎระเบียบการใช้ห้องประชุม' },
    { key: 'contact_email', value: 'parliament@kmutnb.ac.th', description: 'อีเมลติดต่อ' },
    { key: 'contact_phone', value: '02-555-2000 ต่อ 1133', description: 'เบอร์ติดต่อ' },
  ];

  for (const s of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  const existingBookingsCount = await prisma.booking.count();
  if (existingBookingsCount === 0) {
    const b1 = await prisma.booking.create({
      data: {
        bookingCode: 'KMUTNB-2026-0001',
        date: '2026-03-15',
        startTime: '13:00',
        endTime: '15:00',
        fullName: 'นายสมชาย เรียนดี',
        studentId: '6501012345',
        email: 's6501012345@kmutnb.ac.th',
        phone: '081-234-5678',
        department: 'สโมสรนักศึกษา',
        reason: 'จัดประชุมใหญ่สามัญประจำปี',
        status: BookingStatus.APPROVED,
        approvedById: superAdmin.id,
        approvedAt: new Date('2026-03-01T10:00:00Z'),
      },
    });

    await prisma.booking.create({
      data: {
        bookingCode: 'KMUTNB-2026-0002',
        date: '2026-03-18',
        startTime: '10:00',
        endTime: '12:00',
        fullName: 'นางสาวสมหญิง รักกิจกรรม',
        studentId: '6501056789',
        email: 's6501056789@kmutnb.ac.th',
        phone: '089-876-5432',
        department: 'ชมรมดนตรี',
        reason: 'ซ้อมใหญ่กิจกรรมต้อนรับน้องใหม่',
        status: BookingStatus.PENDING,
      },
    });

    await prisma.booking.create({
      data: {
        bookingCode: 'KMUTNB-2026-0003',
        date: '2026-03-20',
        startTime: '14:00',
        endTime: '16:00',
        fullName: 'นายทดสอบ ระบบ',
        studentId: '6501099999',
        email: 's6501099999@kmutnb.ac.th',
        phone: '086-555-4321',
        department: 'กลุ่มอิสระ',
        reason: 'ติวหนังสือก่อนสอบ',
        status: BookingStatus.REJECTED,
        rejectionReason: 'ห้องประชุมไม่อนุญาตให้ใช้เพื่อติวหนังสือส่วนบุคคล',
        approvedById: staffAdmin.id,
        approvedAt: new Date('2026-03-02T11:00:00Z'),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_INITIALIZED',
        details: 'ระบบและฐานข้อมูลเริ่มต้นทำงานพร้อมข้อมูลตัวอย่าง',
        actorName: 'System Seeder',
        actorRole: 'SYSTEM',
        bookingId: b1.id,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

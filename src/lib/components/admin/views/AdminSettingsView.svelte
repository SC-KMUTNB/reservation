<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Share2,
    Save,
    AlertTriangle,
    FileText,
    Mail,
    Globe,
    Check,
    X,
    ShieldCheck,
    Lock,
    Send,
    Eye,
    EyeOff,
    Table,
    Building,
    Plus,
    Trash2,
    Bell,
    CalendarX,
  } from 'lucide-svelte';
  import { type FacilityConfig, DEFAULT_FACILITY_CONFIG } from '$lib/facility-config';

  let settings = $state<Record<string, string>>({
    site_title: '',
    site_subtitle: '',
    hero_title: '',
    hero_description: '',
    social_facebook: '',
    social_facebook_title: '',
    social_instagram: '',
    social_instagram_title: '',
    social_tiktok: '',
    social_tiktok_title: '',
    complaint_url: '',
    rules_content: '',
    timezone: 'Asia/Bangkok',
    contact_email: '',
    contact_phone: '',
    app_base_url: '',
    email_provider: 'AUTO',
    email_recipient_target: 'BOTH',
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    admin_notification_email: '',
    google_sheet_sync_mode: 'AUTO',
    google_sheet_webhook_url: '',
    google_sheet_id: '',
    google_service_account_email: '',
    google_private_key: '',
    google_sheet_name: 'ตารางจอง',
    webhook_discord_url: '',
    webhook_line_token: '',
    webhook_line_target_id: '',
  });

  let facilityConfig = $state<FacilityConfig>(DEFAULT_FACILITY_CONFIG);
  let newEquipmentName = $state('');
  let newClosedDate = $state('');
  let newClosedReason = $state('');
  let rulesText = $state('');

  let isLoading = $state(true);
  let isSaving = $state(false);
  let isSuperAdmin = $state(false);
  let successMsg = $state<string | null>(null);
  let errorMsg = $state<string | null>(null);

  let showSmtpPass = $state(false);
  let showGoogleKey = $state(false);
  let showDiscordWebhook = $state(false);
  let showLineToken = $state(false);

  let testEmailTo = $state('');
  let isTestingEmail = $state(false);
  let testEmailSuccess = $state<string | null>(null);
  let testEmailError = $state<string | null>(null);

  let testWebhookService = $state<'ALL' | 'DISCORD' | 'LINE'>('ALL');
  let isTestingWebhook = $state(false);
  let testWebhookSuccess = $state<string | null>(null);
  let testWebhookError = $state<string | null>(null);

  onMount(() => {
    fetchSettings();
  });

  async function fetchSettings() {
    isLoading = true;
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const { facility_config_json, ...cleanSettings } = (data.settings || {}) as Record<string, string>;
        settings = { ...settings, ...cleanSettings };
        isSuperAdmin = Boolean(data.isSuperAdmin);
        if (data.facilityConfig) {
          facilityConfig = data.facilityConfig;
          rulesText = (data.facilityConfig.bookingRules || []).join('\n');
        }
        if (cleanSettings?.admin_notification_email) {
          testEmailTo = cleanSettings.admin_notification_email;
        } else if (cleanSettings?.contact_email) {
          testEmailTo = cleanSettings.contact_email;
        }
      }
    } catch (e) {
      console.error(e);
      errorMsg = 'เกิดข้อผิดพลาดในการโหลดข้อมูลการตั้งค่า';
    } finally {
      isLoading = false;
    }
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    isSaving = true;
    successMsg = null;
    errorMsg = null;

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, facilityConfig }),
      });

      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error || 'ไม่สามารถบันทึกข้อมูลได้';
        return;
      }

      successMsg = 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว (ข้อมูลสำคัญได้รับการเข้ารหัสอย่างปลอดภัย)';
      if (data.facilityConfig) {
        facilityConfig = data.facilityConfig;
        rulesText = (data.facilityConfig.bookingRules || []).join('\n');
      }
    } catch (e) {
      console.error(e);
      errorMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    } finally {
      isSaving = false;
    }
  }

  function handleAddEquipment() {
    if (!newEquipmentName.trim()) return;
    const id = `eq_${Date.now()}`;
    facilityConfig.equipmentList = [
      ...(facilityConfig.equipmentList || []),
      { id, name: newEquipmentName.trim(), available: true },
    ];
    newEquipmentName = '';
  }

  function handleToggleEquipment(id: string) {
    facilityConfig.equipmentList = (facilityConfig.equipmentList || []).map((eq) =>
      eq.id === id ? { ...eq, available: !eq.available } : eq
    );
  }

  function handleRemoveEquipment(id: string) {
    facilityConfig.equipmentList = (facilityConfig.equipmentList || []).filter((eq) => eq.id !== id);
  }

  function handleAddClosedDate() {
    if (!newClosedDate.trim()) return;
    facilityConfig.closedDates = [
      ...(facilityConfig.closedDates || []),
      { date: newClosedDate.trim(), reason: newClosedReason.trim() || 'ปิดทำการ' },
    ];
    newClosedDate = '';
    newClosedReason = '';
  }

  function handleRemoveClosedDate(dateStr: string) {
    facilityConfig.closedDates = (facilityConfig.closedDates || []).filter((cd) => cd.date !== dateStr);
  }

  function handleRulesChange(text: string) {
    rulesText = text;
    const parsed = text.split('\n').map((line) => line.trim()).filter(Boolean);
    facilityConfig.bookingRules = parsed;
  }

  async function handleTestEmail() {
    if (!testEmailTo.trim() || !testEmailTo.includes('@')) {
      testEmailError = 'กรุณาระบุที่อยู่อีเมลสำหรับรับข้อความทดสอบ';
      return;
    }

    isTestingEmail = true;
    testEmailSuccess = null;
    testEmailError = null;

    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: testEmailTo.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        testEmailError = data.error || 'การทดสอบส่งอีเมลล้มเหลว';
      } else {
        testEmailSuccess = data.message || 'ส่งอีเมลทดสอบเรียบร้อยแล้ว';
      }
    } catch (err: any) {
      testEmailError = err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    } finally {
      isTestingEmail = false;
    }
  }

  async function handleTestWebhook() {
    isTestingWebhook = true;
    testWebhookSuccess = null;
    testWebhookError = null;

    try {
      const res = await fetch('/api/admin/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: testWebhookService }),
      });
      const data = await res.json();

      if (!res.ok) {
        testWebhookError = data.error || 'การทดสอบส่ง Webhook ล้มเหลว';
      } else {
        testWebhookSuccess = data.message || 'ส่งข้อความทดสอบ Webhook เรียบร้อยแล้ว';
      }
    } catch (err: any) {
      testWebhookError = err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    } finally {
      isTestingWebhook = false;
    }
  }
</script>

{#if isLoading}
  <div class="p-10 text-center text-slate-400 text-xs">กำลังโหลดการตั้งค่าระบบ...</div>
{:else}
  <form onsubmit={handleSave} class="space-y-6">
    <!-- Top Header & Save Button -->
    <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
            ตั้งค่าระบบ & การเชื่อมต่อภายนอก
          </h2>
          {#if isSuperAdmin}
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <ShieldCheck class="w-3 h-3 text-amber-600" />
              Super Admin Access
            </span>
          {/if}
        </div>
        <p class="text-xs text-slate-500 mt-1 font-light">
          ปรับแต่งชื่อระบบ ห้องประชุม เวลาทำการ อุปกรณ์ กฎการจอง อีเมลแจ้งเตือน และการแจ้งเตือน Webhook แบบเรียลไทม์
        </p>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        class="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-warm-xs transition flex items-center gap-2 active-press cursor-pointer self-start sm:self-auto disabled:opacity-50"
      >
        <Save class="w-4 h-4" />
        <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
      </button>
    </div>

    <!-- Notifications -->
    {#if errorMsg}
      <div class="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center justify-between shadow-2xs">
        <div class="flex items-center gap-2.5">
          <AlertTriangle class="w-4 h-4 text-rose-600 shrink-0" />
          <span class="font-medium">{errorMsg}</span>
        </div>
        <button type="button" onclick={() => (errorMsg = null)} class="text-rose-600 font-bold p-1 cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>
    {/if}

    {#if successMsg}
      <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl flex items-center justify-between shadow-2xs">
        <div class="flex items-center gap-2.5">
          <Check class="w-4 h-4 text-emerald-600 shrink-0" />
          <span class="font-medium">{successMsg}</span>
        </div>
        <button type="button" onclick={() => (successMsg = null)} class="text-emerald-600 font-bold p-1 cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>
    {/if}

    <!-- Section 1: General Branding & Hero -->
    <div class="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-4">
      <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div class="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
          <Globe class="w-4 h-4 stroke-[2.2]" />
        </div>
        <div>
          <h3 class="font-bold text-sm text-slate-900">1. ข้อมูลชื่อระบบและแบนเนอร์หลัก</h3>
          <p class="text-[11px] text-slate-500">แสดงผลในแถบเมนูและส่วนหัวของหน้าหลัก</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="setting-site-title" class="block text-xs font-semibold text-slate-700 mb-1">ชื่อเว็บไซต์ (Site Title)</label>
          <input
            id="setting-site-title"
            type="text"
            bind:value={settings.site_title}
            placeholder="สภานักศึกษา มจพ."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        <div>
          <label for="setting-timezone" class="block text-xs font-semibold text-slate-700 mb-1">Timezone ระบบ</label>
          <input
            id="setting-timezone"
            type="text"
            bind:value={settings.timezone}
            placeholder="Asia/Bangkok"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
          />
        </div>

        <div>
          <label for="setting-subtitle" class="block text-xs font-semibold text-slate-700 mb-1">คำบรรยายย่อย (Subtitle / English)</label>
          <input
            id="setting-subtitle"
            type="text"
            bind:value={settings.site_subtitle}
            placeholder="Student Council KMUTNB"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>
      </div>

      <div>
        <label for="setting-hero-title" class="block text-xs font-semibold text-slate-700 mb-1">ข้อความพาดหัวหน้าแรก (Hero Title)</label>
        <input
          id="setting-hero-title"
          type="text"
          bind:value={settings.hero_title}
          placeholder="ยินดีต้อนรับสู่พอร์ทัลสภานักศึกษา มจพ."
          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
        />
      </div>

      <div>
        <label for="setting-hero-desc" class="block text-xs font-semibold text-slate-700 mb-1">คำอธิบายรายละเอียดหน้าแรก (Hero Description)</label>
        <textarea
          id="setting-hero-desc"
          rows={2}
          bind:value={settings.hero_description}
          placeholder="ศูนย์รวมข้อมูลข่าวสาร การจองห้องประชุม..."
          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
        ></textarea>
      </div>
    </div>

    <!-- Section 2: Facility Configuration -->
    <div class="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-5">
      <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <Building class="w-4 h-4 stroke-[2.2]" />
        </div>
        <div>
          <h3 class="font-bold text-sm text-slate-900">2. ตั้งค่าห้องประชุม เวลาทำการ และอุปกรณ์ (Facility Config)</h3>
          <p class="text-[11px] text-slate-500">กำหนดชื่อห้อง พิกัด ความจุ เวลาเปิด-ปิด อุปกรณ์ยืม และวันปิดทำการ</p>
        </div>
      </div>

      <!-- Room Info -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label for="fc-room-name" class="block text-xs font-semibold text-slate-700 mb-1">ชื่อห้องประชุม</label>
          <input
            id="fc-room-name"
            type="text"
            bind:value={facilityConfig.roomName}
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        <div>
          <label for="fc-room-loc" class="block text-xs font-semibold text-slate-700 mb-1">สถานที่ตั้ง / อาคาร</label>
          <input
            id="fc-room-loc"
            type="text"
            bind:value={facilityConfig.roomLocation}
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        <div>
          <label for="fc-room-cap" class="block text-xs font-semibold text-slate-700 mb-1">ความจุสูงสุด (คน)</label>
          <input
            id="fc-room-cap"
            type="number"
            min={1}
            bind:value={facilityConfig.maxCapacity}
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>
      </div>

      <!-- Operating Hours -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
        <div>
          <label for="fc-open-time" class="block text-xs font-semibold text-slate-700 mb-1">เวลาเปิดทำการ (HH:MM)</label>
          <input
            id="fc-open-time"
            type="text"
            pattern="[0-2][0-9]:[0-5][0-9]"
            bind:value={facilityConfig.openTime}
            placeholder="08:00"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        <div>
          <label for="fc-close-time" class="block text-xs font-semibold text-slate-700 mb-1">เวลาปิดทำการ (HH:MM)</label>
          <input
            id="fc-close-time"
            type="text"
            pattern="[0-2][0-9]:[0-5][0-9]"
            bind:value={facilityConfig.closeTime}
            placeholder="20:00"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        <div>
          <label for="fc-slot-interval" class="block text-xs font-semibold text-slate-700 mb-1">ความยาวรอบจอง (นาที)</label>
          <input
            id="fc-slot-interval"
            type="number"
            min={15}
            step={15}
            bind:value={facilityConfig.slotIntervalMinutes}
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        <div>
          <label for="fc-max-advance" class="block text-xs font-semibold text-slate-700 mb-1">จองล่วงหน้าสูงสุด (วัน)</label>
          <input
            id="fc-max-advance"
            type="number"
            min={1}
            bind:value={facilityConfig.maxAdvanceBookingDays}
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>
      </div>

      <!-- Equipment Management -->
      <div class="pt-2 border-t border-slate-100 space-y-3">
        <span class="block text-xs font-bold text-slate-800">
          รายการอุปกรณ์ที่มีให้บริการ
        </span>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {#each facilityConfig.equipmentList || [] as eq}
            <div
              class="flex items-center justify-between p-2.5 rounded-xl border text-xs transition {eq.available
                ? 'bg-slate-50 border-slate-200 text-slate-800'
                : 'bg-slate-100/60 border-slate-200 text-slate-400 line-through'}"
            >
              <label class="flex items-center gap-2 cursor-pointer select-none flex-grow">
                <input
                  type="checkbox"
                  checked={eq.available}
                  onchange={() => handleToggleEquipment(eq.id)}
                  class="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <span>{eq.name}</span>
              </label>
              <button
                type="button"
                onclick={() => handleRemoveEquipment(eq.id)}
                class="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                title="ลบอุปกรณ์"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          {/each}
        </div>

        <div class="flex gap-2 max-w-md pt-1">
          <input
            type="text"
            bind:value={newEquipmentName}
            placeholder="ชื่ออุปกรณ์ใหม่ เช่น เครื่องบันทึกเสียง..."
            class="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="button"
            onclick={handleAddEquipment}
            class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 active-press cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" /> เพิ่ม
          </button>
        </div>
      </div>

      <!-- Blackout Dates -->
      <div class="pt-2 border-t border-slate-100 space-y-3">
        <div class="flex items-center gap-2">
          <CalendarX class="w-4 h-4 text-rose-500" />
          <span class="text-xs font-bold text-slate-800">
            วันหยุดและวันงดให้บริการ (Blackout Dates)
          </span>
        </div>

        {#if (facilityConfig.closedDates || []).length > 0}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {#each facilityConfig.closedDates || [] as cd}
              <div
                class="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900"
              >
                <div>
                  <span class="font-mono font-bold mr-2">{cd.date}</span>
                  <span class="text-rose-700">({cd.reason})</span>
                </div>
                <button
                  type="button"
                  onclick={() => handleRemoveClosedDate(cd.date)}
                  class="text-rose-500 hover:text-rose-700 p-1 rounded-md transition cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            {/each}
          </div>
        {/if}

        <div class="flex flex-wrap gap-2 pt-1">
          <input
            type="date"
            bind:value={newClosedDate}
            class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="text"
            bind:value={newClosedReason}
            placeholder="เหตุผล (เช่น วันหยุดนักขัตฤกษ์)"
            class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 flex-grow max-w-xs"
          />
          <button
            type="button"
            onclick={handleAddClosedDate}
            class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 active-press cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" /> เพิ่มวันปิดทำการ
          </button>
        </div>
      </div>

      <!-- Booking Rules -->
      <div class="pt-2 border-t border-slate-100">
        <label for="fc-rules-text" class="block text-xs font-semibold text-slate-700 mb-1">
          ข้อปฏิบัติและระเบียบการใช้ห้องประชุม (แยกบรรทัดละ 1 ข้อ)
        </label>
        <textarea
          id="fc-rules-text"
          rows={4}
          value={rulesText}
          oninput={(e) => handleRulesChange((e.currentTarget as HTMLTextAreaElement).value)}
          placeholder="1. รักษาความสะอาดห้องประชุม&#10;2. ห้ามนำอาหารและเครื่องดื่มเข้ามา..."
          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white leading-relaxed"
        ></textarea>
      </div>
    </div>

    <!-- Section 3: Official Social Media Channels -->
    <div class="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-4">
      <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
          <Share2 class="w-4 h-4 stroke-[2.2]" />
        </div>
        <div>
          <h3 class="font-bold text-sm text-slate-900">3. ช่องทางโซเชียลมีเดียทางการ</h3>
          <p class="text-[11px] text-slate-500">ลิงก์และชื่อบัญชีแสดงผลในหน้าแรก</p>
        </div>
      </div>

      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div>
            <label for="setting-fb-title" class="block text-xs font-semibold text-slate-700 mb-1">ชื่อเพจ Facebook</label>
            <input
              id="setting-fb-title"
              type="text"
              bind:value={settings.social_facebook_title}
              placeholder="สภานักศึกษา มจพ."
              class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label for="setting-fb-url" class="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ Facebook URL</label>
            <input
              id="setting-fb-url"
              type="url"
              bind:value={settings.social_facebook}
              placeholder="https://facebook.com/..."
              class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div>
            <label for="setting-ig-title" class="block text-xs font-semibold text-slate-700 mb-1">ชื่อบัญชี Instagram</label>
            <input
              id="setting-ig-title"
              type="text"
              bind:value={settings.social_instagram_title}
              placeholder="@kmutnb_council"
              class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label for="setting-ig-url" class="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ Instagram URL</label>
            <input
              id="setting-ig-url"
              type="url"
              bind:value={settings.social_instagram}
              placeholder="https://instagram.com/..."
              class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div>
            <label for="setting-tt-title" class="block text-xs font-semibold text-slate-700 mb-1">ชื่อบัญชี TikTok</label>
            <input
              id="setting-tt-title"
              type="text"
              bind:value={settings.social_tiktok_title}
              placeholder="สภานักศึกษา มจพ."
              class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label for="setting-tt-url" class="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ TikTok URL</label>
            <input
              id="setting-tt-url"
              type="url"
              bind:value={settings.social_tiktok}
              placeholder="https://tiktok.com/@..."
              class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Section 4: Complaints & Contact -->
    <div class="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-4">
      <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <FileText class="w-4 h-4 stroke-[2.2]" />
        </div>
        <div>
          <h3 class="font-bold text-sm text-slate-900">4. ข้อมูลร้องเรียนและช่องทางติดต่อ</h3>
          <p class="text-[11px] text-slate-500">ฟอร์มรับเรื่องร้องเรียน และข้อมูลท้ายหน้าเว็บ</p>
        </div>
      </div>

      <div>
        <label for="setting-complaint" class="block text-xs font-semibold text-slate-700 mb-1">
          ลิงก์ Google Form รับเรื่องร้องเรียน
        </label>
        <input
          id="setting-complaint"
          type="url"
          bind:value={settings.complaint_url}
          placeholder="https://forms.gle/..."
          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="setting-contact-email" class="block text-xs font-semibold text-slate-700 mb-1">อีเมลติดต่อทางการ</label>
          <input
            id="setting-contact-email"
            type="email"
            bind:value={settings.contact_email}
            placeholder="council@kmutnb.ac.th"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
          />
        </div>

        <div>
          <label for="setting-contact-phone" class="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
          <input
            id="setting-contact-phone"
            type="text"
            bind:value={settings.contact_phone}
            placeholder="02-555-2000 ต่อ 1135"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>
      </div>
    </div>

    <!-- Super Admin Section 5: Email Protocol & Notifications -->
    {#if isSuperAdmin}
      <div class="bg-white rounded-3xl p-6 md:p-7 border border-orange-200/80 shadow-warm space-y-5">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Mail class="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-slate-900">5. ระบบแจ้งเตือนทางอีเมล (Email Notifications)</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Super Admin Only
                </span>
              </div>
              <p class="text-[11px] text-slate-500">
                ส่งอีเมลแจ้งเตือนแอดมินเมื่อมีคำขอใหม่ และแจ้งผู้จองเมื่อมีการเปลี่ยนสถานะคำขอ (รหัสผ่าน/คีย์จะถูกเข้ารหัส AES-256-GCM)
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <Lock class="w-3 h-3 text-emerald-600" />
            <span>AES-256-GCM Encrypted at Rest</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="setting-base-url" class="block text-xs font-semibold text-slate-700 mb-1">
              Base URL สำหรับลิงก์ในอีเมล
            </label>
            <input
              id="setting-base-url"
              type="url"
              bind:value={settings.app_base_url}
              placeholder="https://your-domain.vercel.app"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
            />
          </div>

          <div>
            <label for="setting-email-provider" class="block text-xs font-semibold text-slate-700 mb-1">
              ผู้ให้บริการอีเมล (Active Provider)
            </label>
            <select
              id="setting-email-provider"
              bind:value={settings.email_provider}
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
            >
              <option value="SMTP">SMTP (Google SMTP / Gmail หรือ Mail Server องค์กร)</option>
              <option value="DISABLED">DISABLED (ปิดระบบแจ้งเตือนทางอีเมล)</option>
            </select>
          </div>

          <div>
            <label for="setting-email-target" class="block text-xs font-semibold text-slate-700 mb-1">
              ส่งอีเมลแจ้งเตือนถึง (Send Email To)
            </label>
            <select
              id="setting-email-target"
              bind:value={settings.email_recipient_target}
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
            >
              <option value="BOTH">ทั้งแอดมินและผู้ขอจอง (Both Admin & Booking Person)</option>
              <option value="ADMIN_ONLY">เฉพาะแอดมินเท่านั้น (Admin Only)</option>
              <option value="BOOKING_PERSON">เฉพาะผู้ขอจองเท่านั้น (Booking Person Only)</option>
            </select>
          </div>

          <div>
            <label for="setting-admin-email" class="block text-xs font-semibold text-slate-700 mb-1">
              อีเมลแอดมินสำหรับรับการแจ้งเตือนคำขอใหม่
            </label>
            <input
              id="setting-admin-email"
              type="email"
              bind:value={settings.admin_notification_email}
              placeholder="sc.kmutnb65@gmail.com"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
            />
          </div>
        </div>

        <!-- Sub-card: SMTP Configuration -->
        <div class="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
          <div class="text-xs font-bold text-slate-800">
            การตั้งค่าเชื่อมต่อ SMTP Server
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label for="smtp-host" class="block text-[11px] font-semibold text-slate-700 mb-1">SMTP Host</label>
              <input
                id="smtp-host"
                type="text"
                bind:value={settings.smtp_host}
                placeholder="smtp.gmail.com"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label for="smtp-port" class="block text-[11px] font-semibold text-slate-700 mb-1">SMTP Port</label>
              <input
                id="smtp-port"
                type="text"
                bind:value={settings.smtp_port}
                placeholder="587"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label for="smtp-secure" class="block text-[11px] font-semibold text-slate-700 mb-1">Secure (SSL / TLS)</label>
              <select
                id="smtp-secure"
                bind:value={settings.smtp_secure}
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
              >
                <option value="false">STARTTLS (Port 587 - ค่าเริ่มต้น)</option>
                <option value="true">SSL / TLS (Port 465)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label for="smtp-user" class="block text-[11px] font-semibold text-slate-700 mb-1">SMTP Username</label>
              <input
                id="smtp-user"
                type="text"
                bind:value={settings.smtp_user}
                placeholder="your-email@gmail.com"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label for="smtp-pass" class="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <span>SMTP Password / App Password</span>
                  <Lock class="w-2.5 h-2.5 text-emerald-600" />
                </label>
                <button
                  type="button"
                  onclick={() => (showSmtpPass = !showSmtpPass)}
                  class="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  {#if showSmtpPass}
                    <EyeOff class="w-3 h-3" />
                  {:else}
                    <Eye class="w-3 h-3" />
                  {/if}
                  <span>{showSmtpPass ? 'ซ่อน' : 'แสดง'}</span>
                </button>
              </div>
              <input
                id="smtp-pass"
                type={showSmtpPass ? 'text' : 'password'}
                bind:value={settings.smtp_pass}
                placeholder="App Password 16 หลัก"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label for="smtp-from" class="block text-[11px] font-semibold text-slate-700 mb-1">From Name & Email</label>
              <input
                id="smtp-from"
                type="text"
                bind:value={settings.smtp_from}
                placeholder="สภานักศึกษา มจพ. <no-reply@kmutnb.ac.th>"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          <!-- Test Email Box -->
          <div class="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <input
              type="email"
              bind:value={testEmailTo}
              placeholder="ใส่อีเมลสำหรับรับผลทดสอบ..."
              class="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono flex-grow max-w-sm"
            />
            <button
              type="button"
              disabled={isTestingEmail}
              onclick={handleTestEmail}
              class="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 active-press cursor-pointer disabled:opacity-50"
            >
              <Send class="w-3.5 h-3.5" />
              <span>{isTestingEmail ? 'กำลังส่งทดสอบ...' : 'ทดสอบส่งอีเมล'}</span>
            </button>
            {#if testEmailSuccess}
              <span class="text-emerald-700 text-xs font-medium">{testEmailSuccess}</span>
            {/if}
            {#if testEmailError}
              <span class="text-rose-700 text-xs font-medium">{testEmailError}</span>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Super Admin Section 6: Webhook Notifications (Discord & LINE) -->
    {#if isSuperAdmin}
      <div class="bg-white rounded-3xl p-6 md:p-7 border border-indigo-200/80 shadow-warm space-y-5">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Bell class="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-slate-900">6. ระบบแจ้งเตือนเรียลไทม์ผ่าน Webhook (Discord & LINE)</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Super Admin Only
                </span>
              </div>
              <p class="text-[11px] text-slate-500">
                ส่งข้อความแจ้งเตือนอัตโนมัติเข้า Discord Channel หรือ LINE กลุ่ม/แอดมินทันทีที่มีคำขอใหม่หรือการอัปเดตสถานะ
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <Lock class="w-3 h-3 text-emerald-600" />
            <span>AES-256-GCM Encrypted at Rest</span>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Discord Webhook -->
          <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div class="flex justify-between items-center">
              <label for="discord-webhook-url" class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span>Discord Webhook URL</span>
              </label>
              <button
                type="button"
                onclick={() => (showDiscordWebhook = !showDiscordWebhook)}
                class="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                {#if showDiscordWebhook}
                  <EyeOff class="w-3 h-3" />
                {:else}
                  <Eye class="w-3 h-3" />
                {/if}
                <span>{showDiscordWebhook ? 'ซ่อน' : 'แสดง'}</span>
              </button>
            </div>
            <input
              id="discord-webhook-url"
              type={showDiscordWebhook ? 'text' : 'password'}
              bind:value={settings.webhook_discord_url}
              placeholder="https://discord.com/api/webhooks/..."
              class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>

          <!-- LINE Messaging Token -->
          <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>LINE Messaging API / Push Notification</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label for="line-token" class="text-[11px] font-semibold text-slate-700">LINE Channel Access Token</label>
                  <button
                    type="button"
                    onclick={() => (showLineToken = !showLineToken)}
                    class="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    {#if showLineToken}
                      <EyeOff class="w-3 h-3" />
                    {:else}
                      <Eye class="w-3 h-3" />
                    {/if}
                    <span>{showLineToken ? 'ซ่อน' : 'แสดง'}</span>
                  </button>
                </div>
                <input
                  id="line-token"
                  type={showLineToken ? 'text' : 'password'}
                  bind:value={settings.webhook_line_token}
                  placeholder="LINE Channel Long-lived Access Token..."
                  class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label for="line-target" class="block text-[11px] font-semibold text-slate-700 mb-1">
                  LINE Target ID (User ID หรือ Group ID)
                </label>
                <input
                  id="line-target"
                  type="text"
                  bind:value={settings.webhook_line_target_id}
                  placeholder="U12345678... หรือ C12345678..."
                  class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <!-- Test Webhook Controls -->
          <div class="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <select
              bind:value={testWebhookService}
              class="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium"
            >
              <option value="ALL">ทดสอบทั้ง Discord & LINE</option>
              <option value="DISCORD">เฉพาะ Discord</option>
              <option value="LINE">เฉพาะ LINE</option>
            </select>

            <button
              type="button"
              disabled={isTestingWebhook}
              onclick={handleTestWebhook}
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 active-press cursor-pointer disabled:opacity-50"
            >
              <Send class="w-3.5 h-3.5" />
              <span>{isTestingWebhook ? 'กำลังส่ง...' : 'ทดสอบส่ง Webhook'}</span>
            </button>

            {#if testWebhookSuccess}
              <span class="text-emerald-700 text-xs font-medium">{testWebhookSuccess}</span>
            {/if}
            {#if testWebhookError}
              <span class="text-rose-700 text-xs font-medium">{testWebhookError}</span>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Super Admin Section 7: Google Sheets Database Sync -->
    {#if isSuperAdmin}
      <div class="bg-white rounded-3xl p-6 md:p-7 border border-emerald-200/80 shadow-warm space-y-4">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Table class="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-slate-900">7. การซิงก์ข้อมูลลง Google Sheets</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Super Admin Only
                </span>
              </div>
              <p class="text-[11px] text-slate-500">
                สำรองข้อมูลการจองลงสเปรดชีตอัตโนมัติแบบเรียลไทม์
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <Lock class="w-3 h-3 text-emerald-600" />
            <span>AES-256-GCM Encrypted at Rest</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="gsheet-sync-mode" class="block text-xs font-semibold text-slate-700 mb-1">
              โหมดการซิงก์ (Sync Mode)
            </label>
            <select
              id="gsheet-sync-mode"
              bind:value={settings.google_sheet_sync_mode}
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
            >
              <option value="AUTO">AUTO (Webhook ก่อน แล้วสำรองด้วย Service Account)</option>
              <option value="WEBHOOK">WEBHOOK ONLY (Google Apps Script Web App)</option>
              <option value="SERVICE_ACCOUNT">SERVICE ACCOUNT ONLY (Google Cloud API v4)</option>
              <option value="DISABLED">DISABLED (ปิดการเชื่อมต่อ Google Sheets)</option>
            </select>
          </div>

          <div>
            <label for="gsheet-name" class="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อแท็บชีต (Sheet Name)
            </label>
            <input
              id="gsheet-name"
              type="text"
              bind:value={settings.google_sheet_name}
              placeholder="ตารางจอง"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
        </div>

        <!-- Webhook Option -->
        <div class="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2">
          <div class="text-xs font-bold text-slate-800">
            ทางเลือกที่ 1: Google Apps Script Webhook (แนะนำ - ตั้งค่าง่ายสุด)
          </div>
          <p class="text-[11px] text-slate-500 leading-relaxed">
            ใน Google Sheets กดเมนู <em>ส่วนขยาย (Extensions) &rarr; Apps Script</em> วางสคริปต์ Webhook แล้ว Deploy เป็น Web App (สิทธิ์ Anyone) จากนั้นนำ Webhook URL มาวางที่นี่
          </p>
          <div>
            <label for="gsheet-webhook-url" class="block text-[11px] font-semibold text-slate-700 mb-1">Apps Script Webhook URL</label>
            <input
              id="gsheet-webhook-url"
              type="url"
              bind:value={settings.google_sheet_webhook_url}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
            />
          </div>
        </div>

        <!-- Service Account Option -->
        <div class="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
          <div class="text-xs font-bold text-slate-800">
            ทางเลือกที่ 2: Google Cloud Service Account (API v4)
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="gsheet-id" class="block text-[11px] font-semibold text-slate-700 mb-1">
                Spreadsheet ID (ดูจาก URL ของ Google Sheet)
              </label>
              <input
                id="gsheet-id"
                type="text"
                bind:value={settings.google_sheet_id}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>

            <div>
              <label for="gsheet-sa-email" class="block text-[11px] font-semibold text-slate-700 mb-1">
                Service Account Email
              </label>
              <input
                id="gsheet-sa-email"
                type="email"
                bind:value={settings.google_service_account_email}
                placeholder="bot-reservation@project.iam.gserviceaccount.com"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1">
              <label for="gsheet-sa-key" class="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <span>Service Account Private Key (RSA PEM)</span>
                <Lock class="w-2.5 h-2.5 text-emerald-600" />
              </label>
              <button
                type="button"
                onclick={() => (showGoogleKey = !showGoogleKey)}
                class="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                {#if showGoogleKey}
                  <EyeOff class="w-3 h-3" />
                {:else}
                  <Eye class="w-3 h-3" />
                {/if}
                <span>{showGoogleKey ? 'ซ่อน' : 'แสดง'}</span>
              </button>
            </div>
            <textarea
              id="gsheet-sa-key"
              rows={3}
              bind:value={settings.google_private_key}
              placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;••••••••••••••••&#10;-----END RSA PRIVATE KEY-----"
              class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono text-[11px]"
            ></textarea>
          </div>
        </div>
      </div>
    {/if}

    <!-- Bottom Save Bar -->
    <div class="flex justify-end pt-2">
      <button
        type="submit"
        disabled={isSaving}
        class="bg-orange-600 hover:bg-orange-700 text-white px-7 py-3 rounded-2xl text-xs font-bold shadow-warm hover:shadow-warm-lg transition-all duration-200 flex items-center gap-2 active-press cursor-pointer disabled:opacity-50"
      >
        <Save class="w-4 h-4" />
        <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลงทั้งหมด'}</span>
      </button>
    </div>
  </form>
{/if}

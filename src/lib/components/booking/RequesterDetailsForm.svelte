<script lang="ts">
  import { User, Mail, Phone, Hash, Building, FileText, Trash2, AlertTriangle } from 'lucide-svelte';
  import type { BookingFormData } from '$lib/types/booking';

  interface Props {
    formData: BookingFormData;
    onChange: (field: keyof BookingFormData, value: string) => void;
    errors: Record<string, string | undefined>;
    rememberMe: boolean;
    onToggleRememberMe: (val: boolean) => void;
    onClearSavedProfile: () => void;
    hasSavedProfile: boolean;
    onSubmit: (e: SubmitEvent) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    conflictMessage?: string | null;
  }

  let {
    formData,
    onChange,
    errors,
    rememberMe,
    onToggleRememberMe,
    onClearSavedProfile,
    hasSavedProfile,
    onSubmit,
    onCancel,
    isSubmitting,
    conflictMessage,
  }: Props = $props();
</script>

<form onsubmit={onSubmit} class="space-y-4 text-xs">
  <!-- Header and Prefill Info -->
  <div class="flex justify-between items-center pb-2 border-b border-slate-100">
    <h4 class="font-bold text-sm text-slate-800">ข้อมูลผู้ขอใช้บริการ</h4>
    {#if hasSavedProfile}
      <button
        type="button"
        onclick={onClearSavedProfile}
        class="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition"
      >
        <Trash2 class="w-3 h-3" /> ล้างข้อมูลที่บันทึกไว้ (Clear saved info)
      </button>
    {/if}
  </div>

  {#if conflictMessage}
    <div class="bg-rose-50 border border-rose-300 text-rose-700 p-3 rounded-2xl flex items-start gap-2">
      <AlertTriangle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      <span class="font-medium">{conflictMessage}</span>
    </div>
  {/if}

  <!-- Full Name -->
  <div>
    <label for="requester-fullname" class="block font-semibold text-slate-700 mb-1">
      ชื่อ-นามสกุล ผู้จอง <span class="text-rose-500">*</span>
    </label>
    <div class="relative">
      <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        id="requester-fullname"
        type="text"
        required
        value={formData.fullName}
        oninput={(e) => onChange('fullName', (e.currentTarget as HTMLInputElement).value)}
        placeholder="เช่น นายสมชาย ใจดี"
        class="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
      />
    </div>
    {#if errors.fullName}
      <p class="text-[11px] text-rose-600 mt-1">{errors.fullName}</p>
    {/if}
  </div>

  <!-- Student ID & Phone -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label for="requester-studentid" class="block font-semibold text-slate-700 mb-1">
        รหัสนักศึกษา (13 หลัก) <span class="text-rose-500">*</span>
      </label>
      <div class="relative">
        <Hash class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="requester-studentid"
          type="text"
          required
          maxlength={13}
          value={formData.studentId}
          oninput={(e) => onChange('studentId', (e.currentTarget as HTMLInputElement).value)}
          placeholder="เช่น 6501012345678"
          class="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
        />
      </div>
      {#if errors.studentId}
        <p class="text-[11px] text-rose-600 mt-1">{errors.studentId}</p>
      {/if}
    </div>

    <div>
      <label for="requester-phone" class="block font-semibold text-slate-700 mb-1">
        เบอร์ติดต่อ <span class="text-rose-500">*</span>
      </label>
      <div class="relative">
        <Phone class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="requester-phone"
          type="tel"
          required
          value={formData.phone}
          oninput={(e) => onChange('phone', (e.currentTarget as HTMLInputElement).value)}
          placeholder="เช่น 0812345678"
          class="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
        />
      </div>
      {#if errors.phone}
        <p class="text-[11px] text-rose-600 mt-1">{errors.phone}</p>
      {/if}
    </div>
  </div>

  <!-- Email & Department -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label for="requester-email" class="block font-semibold text-slate-700 mb-1">
        อีเมลผู้จอง <span class="text-rose-500">*</span>
      </label>
      <div class="relative">
        <Mail class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="requester-email"
          type="email"
          required
          value={formData.email}
          oninput={(e) => onChange('email', (e.currentTarget as HTMLInputElement).value)}
          placeholder="เช่น s6501012345678@kmutnb.ac.th"
          class="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
        />
      </div>
      {#if errors.email}
        <p class="text-[11px] text-rose-600 mt-1">{errors.email}</p>
      {/if}
    </div>

    <div>
      <label for="requester-dept" class="block font-semibold text-slate-700 mb-1">
        หน่วยงาน / ชมรม / คณะ <span class="text-rose-500">*</span>
      </label>
      <div class="relative">
        <Building class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="requester-dept"
          type="text"
          required
          value={formData.department}
          oninput={(e) => onChange('department', (e.currentTarget as HTMLInputElement).value)}
          placeholder="เช่น สโมสรนักศึกษาคณะวิศวกรรมศาสตร์"
          class="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
        />
      </div>
      {#if errors.department}
        <p class="text-[11px] text-rose-600 mt-1">{errors.department}</p>
      {/if}
    </div>
  </div>

  <!-- Meeting Reason -->
  <div>
    <label for="requester-reason" class="block font-semibold text-slate-700 mb-1">
      เหตุผลและวาระการประชุม <span class="text-rose-500">*</span>
    </label>
    <div class="relative">
      <FileText class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
      <textarea
        id="requester-reason"
        rows={2}
        required
        value={formData.reason}
        oninput={(e) => onChange('reason', (e.currentTarget as HTMLTextAreaElement).value)}
        placeholder="ระบุวาระการประชุมหรือกิจกรรมพอสังเขป (อย่างน้อย 5 ตัวอักษร)"
        class="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
      ></textarea>
    </div>
    {#if errors.reason}
      <p class="text-[11px] text-rose-600 mt-1">{errors.reason}</p>
    {/if}
  </div>

  <!-- Opt-in LocalStorage Prefill Checkbox -->
  <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
    <label class="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={rememberMe}
        onchange={(e) => onToggleRememberMe((e.currentTarget as HTMLInputElement).checked)}
        class="w-4 h-4 text-orange-600 rounded-md border-slate-300 focus:ring-orange-500 cursor-pointer"
      />
      <span class="text-xs text-slate-700 font-medium">
        จดจำข้อมูลผู้จองไว้ในอุปกรณ์นี้สำหรับครั้งถัดไป
      </span>
    </label>
  </div>

  <!-- Buttons -->
  <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
    <button
      type="button"
      onclick={onCancel}
      class="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium text-xs transition cursor-pointer"
    >
      ยกเลิก
    </button>
    <button
      type="submit"
      disabled={isSubmitting || !!conflictMessage}
      class="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition shadow-warm-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      ตรวจสอบกฎระเบียบและยืนยัน
    </button>
  </div>
</form>

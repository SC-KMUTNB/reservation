<script lang="ts">
  import { onMount } from 'svelte';
  import {
    UserPlus,
    Shield,
    Key,
    Trash2,
    X,
    AlertTriangle,
    Edit2,
    Check,
    Send,
    RefreshCw,
    Clock,
    Sparkles,
  } from 'lucide-svelte';

  interface AdminUserItem {
    id: string;
    email: string;
    username?: string | null;
    fullName: string;
    role: 'SUPER_ADMIN' | 'ADMIN';
    isActive: boolean;
    inviteToken?: string | null;
    inviteExpiresAt?: string | null;
    createdAt: string;
    _count?: {
      approvedBookings: number;
    };
  }

  let users = $state<AdminUserItem[]>([]);
  let isLoading = $state(true);
  let isAddModalOpen = $state(false);
  let isEditModalOpen = $state(false);
  let selectedUser = $state<AdminUserItem | null>(null);

  let formData = $state({
    fullName: '',
    email: '',
    password: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
  });

  let creationMode = $state<'invite' | 'direct'>('invite');
  let isResending = $state<string | null>(null);

  let editFormData = $state({
    fullName: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
    isActive: true,
    password: '',
  });

  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  onMount(() => {
    fetchUsers();
  });

  async function fetchUsers() {
    isLoading = true;
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        users = data.users || [];
      } else {
        errorMsg = 'ไม่สามารถเข้าถึงข้อมูลผู้ดูแลระบบได้';
      }
    } catch (e) {
      console.error(e);
      errorMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    } finally {
      isLoading = false;
    }
  }

  async function handleResendInvite(userId: string, userEmail: string) {
    isResending = userId;
    errorMsg = null;
    successMsg = null;
    try {
      const res = await fetch(`/api/users/${userId}/resend-invite`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        errorMsg = data.error || 'ไม่สามารถส่งคำเชิญซ้ำได้';
        return;
      }
      successMsg = data.message || `ส่งคำเชิญใหม่ไปยัง ${userEmail} เรียบร้อยแล้ว`;
      fetchUsers();
    } catch {
      errorMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    } finally {
      isResending = null;
    }
  }

  async function handleAddUser(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = null;
    successMsg = null;

    try {
      const payload = {
        ...formData,
        sendInvite: creationMode === 'invite',
      };

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error || 'ไม่สามารถเพิ่มผู้ดูแลระบบได้';
        return;
      }

      successMsg = data.message || `เพิ่มผู้ดูแลระบบ ${data.user.fullName} เรียบร้อยแล้ว`;
      isAddModalOpen = false;
      formData = {
        fullName: '',
        email: '',
        password: '',
        role: 'ADMIN',
      };
      fetchUsers();
    } catch (e) {
      console.error(e);
      errorMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    }
  }

  async function handleEditUser(e: SubmitEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    errorMsg = null;
    successMsg = null;

    try {
      const payload: any = {
        fullName: editFormData.fullName,
        role: editFormData.role,
        isActive: editFormData.isActive,
      };

      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error || 'ไม่สามารถแก้ไขข้อมูลผู้ดูแลระบบได้';
        return;
      }

      successMsg = `อัปเดตข้อมูลของ ${data.user.fullName} เรียบร้อยแล้ว`;
      isEditModalOpen = false;
      selectedUser = null;
      fetchUsers();
    } catch (e) {
      console.error(e);
      errorMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    }
  }

  async function handleDeleteUser(id: string, name: string) {
    if (!confirm(`คุณต้องการลบผู้ดูแลระบบ ${name} ใช่หรือไม่?`)) return;

    errorMsg = null;
    successMsg = null;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error || 'ไม่สามารถลบผู้ดูแลระบบได้';
        return;
      }

      successMsg = 'ลบผู้ดูแลระบบเรียบร้อยแล้ว';
      fetchUsers();
    } catch (e) {
      console.error(e);
      errorMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    }
  }

  function openEditModal(u: AdminUserItem) {
    selectedUser = u;
    editFormData = {
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      password: '',
    };
    isEditModalOpen = true;
  }
</script>

<div class="space-y-6">
  <!-- Top Header -->
  <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
    <div>
      <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
        จัดการบัญชีผู้ดูแลระบบ
      </h2>
      <p class="text-xs text-slate-500 mt-1 font-light">
        กำหนดสิทธิ์การเข้าถึง และจัดการบัญชีเจ้าหน้าที่สภานักศึกษา มจพ.
      </p>
    </div>

    <button
      type="button"
      onclick={() => (isAddModalOpen = true)}
      class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-warm-xs transition flex items-center gap-2 active-press cursor-pointer self-start sm:self-auto"
    >
      <UserPlus class="w-4 h-4" /> เพิ่มผู้ดูแลระบบใหม่
    </button>
  </div>

  <!-- Notifications -->
  {#if errorMsg}
    <div class="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center justify-between shadow-2xs">
      <div class="flex items-center gap-2.5">
        <AlertTriangle class="w-4 h-4 text-rose-600 shrink-0" />
        <span class="font-medium">{errorMsg}</span>
      </div>
      <button onclick={() => (errorMsg = null)} class="text-rose-600 font-bold p-1 cursor-pointer">
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
      <button onclick={() => (successMsg = null)} class="text-emerald-600 font-bold p-1 cursor-pointer">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- Users Table Card -->
  <div class="bg-white rounded-3xl border border-slate-200/90 shadow-warm p-5 md:p-6 space-y-4">
    <div class="overflow-x-auto rounded-2xl border border-slate-200">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="bg-slate-50/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
            <th class="p-3.5">ผู้ดูแลระบบ</th>
            <th class="p-3.5">อีเมลล็อกอิน</th>
            <th class="p-3.5">ระดับสิทธิ์ (Role)</th>
            <th class="p-3.5">สถานะบัญชี</th>
            <th class="p-3.5">สถิติการอนุมัติ</th>
            <th class="p-3.5 text-right">จัดการ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            <tr>
              <td colspan="6" class="p-8 text-center text-slate-400">
                กำลังโหลดข้อมูลผู้ใช้งาน...
              </td>
            </tr>
          {:else if users.length === 0}
            <tr>
              <td colspan="6" class="p-8 text-center text-slate-400">
                ไม่พบบัญชีผู้ใช้งานในระบบ
              </td>
            </tr>
          {:else}
            {#each users as u}
              <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="p-3.5">
                  <div class="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-mono text-[11px]">
                      {u.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <span>{u.fullName}</span>
                      {#if u.username}
                        <span class="block text-[10px] text-orange-600 font-mono font-medium">
                          @{u.username}
                        </span>
                      {/if}
                    </div>
                  </div>
                </td>

                <td class="p-3.5 font-mono text-slate-600 text-[11px]">
                  {u.email}
                </td>

                <td class="p-3.5">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-2xs {u.role === 'SUPER_ADMIN'
                      ? 'bg-orange-50 text-orange-800 border border-orange-300'
                      : 'bg-blue-50 text-blue-800 border border-blue-300'}"
                  >
                    <Shield class="w-3 h-3" />
                    {u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                  </span>
                </td>

                <td class="p-3.5">
                  {#if u.inviteToken}
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                      <Clock class="w-3 h-3 text-amber-600" /> รอตั้งรหัสผ่าน
                    </span>
                  {:else}
                    <span
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold {u.isActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'}"
                    >
                      {u.isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}
                    </span>
                  {/if}
                </td>

                <td class="p-3.5 tabular-nums font-mono text-slate-600">
                  {u._count?.approvedBookings ?? 0} ครั้ง
                </td>

                <td class="p-3.5 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    {#if u.inviteToken}
                      <button
                        type="button"
                        onclick={() => handleResendInvite(u.id, u.email)}
                        disabled={isResending === u.id}
                        class="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-medium transition active-press flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="ส่งอีเมลคำเชิญใหม่ (อายุ 48 ชม.)"
                      >
                        {#if isResending === u.id}
                          <RefreshCw class="w-3 h-3 animate-spin text-orange-600" />
                        {:else}
                          <Send class="w-3 h-3 text-orange-600" />
                        {/if}
                        <span>ส่งคำเชิญซ้ำ</span>
                      </button>
                    {/if}
                    <button
                      type="button"
                      onclick={() => openEditModal(u)}
                      class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition active-press flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 class="w-3 h-3" /> แก้ไข
                    </button>
                    <button
                      type="button"
                      onclick={() => handleDeleteUser(u.id, u.fullName)}
                      class="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="ลบบัญชีนี้"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Add User Modal -->
  {#if isAddModalOpen}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div class="flex justify-between items-start mb-4 pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 class="text-lg font-bold text-slate-900">เพิ่มผู้ดูแลระบบใหม่</h3>
            <p class="text-xs text-slate-500 mt-0.5">กรอกข้อมูลบัญชีเพื่อเปิดสิทธิ์การเข้าใช้งาน</p>
          </div>
          <button
            type="button"
            onclick={() => (isAddModalOpen = false)}
            class="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 -mr-1">
          <!-- Creation Mode Switcher -->
          <div class="flex bg-slate-100 p-1 rounded-2xl mb-4">
            <button
              type="button"
              onclick={() => (creationMode = 'invite')}
              class="flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer {creationMode === 'invite'
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'}"
            >
              <Send class="w-3.5 h-3.5" />
              <span>ส่งคำเชิญทางอีเมล (แนะนำ)</span>
            </button>
            <button
              type="button"
              onclick={() => (creationMode = 'direct')}
              class="flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer {creationMode === 'direct'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'}"
            >
              <Key class="w-3.5 h-3.5" />
              <span>กำหนดรหัสผ่านทันที</span>
            </button>
          </div>

          <form id="add-user-form" onsubmit={handleAddUser} class="space-y-4 text-xs">
            <div>
              <label for="add-user-name" class="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล</label>
              <input
                id="add-user-name"
                type="text"
                required
                bind:value={formData.fullName}
                placeholder="เช่น นายกฤตภาส เจริญสุข"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label for="add-user-email" class="block font-semibold text-slate-700 mb-1">อีเมลผู้ใช้งาน</label>
              <input
                id="add-user-email"
                type="email"
                required
                bind:value={formData.email}
                placeholder="admin@kmutnb.ac.th"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
              />
            </div>

            {#if creationMode === 'invite'}
              <div class="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-3.5 space-y-1">
                <div class="flex items-center gap-1.5 text-orange-900 font-bold text-xs">
                  <Sparkles class="w-3.5 h-3.5 text-orange-600" />
                  <span>ผู้ใช้จะกำหนดรหัสผ่านด้วยตนเอง</span>
                </div>
                <p class="text-[11px] text-orange-800/90 leading-relaxed font-light">
                  ระบบจะจัดส่งอีเมลคำเชิญไปยัง <span class="font-mono font-medium">{formData.email || 'อีเมลที่ระบุ'}</span> พร้อมปุ่มลิงก์ให้ผู้ใช้เข้ามาตั้งรหัสผ่านและชื่อผู้ใช้ด้วยตนเอง (ลิงก์มีอายุ 48 ชั่วโมง)
                </p>
              </div>
            {:else}
              <div>
                <label for="add-user-pw" class="block font-semibold text-slate-700 mb-1">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</label>
                <input
                  id="add-user-pw"
                  type="password"
                  required={creationMode === 'direct'}
                  minlength={6}
                  bind:value={formData.password}
                  placeholder="••••••••"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
                />
              </div>
            {/if}

            <div>
              <label for="add-user-role" class="block font-semibold text-slate-700 mb-1">ระดับสิทธิ์ (Role)</label>
              <select
                id="add-user-role"
                bind:value={formData.role}
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
              >
                <option value="ADMIN">Admin (เจ้าหน้าที่ - ตรวจสอบและอนุมัติการจอง)</option>
                <option value="SUPER_ADMIN">Super Admin (สิทธิ์สูงสุด - จัดการผู้ใช้และตั้งค่า)</option>
              </select>
            </div>
          </form>
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0 mt-2">
          <button
            type="button"
            onclick={() => (isAddModalOpen = false)}
            class="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="add-user-form"
            class="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition active-press shadow-warm-xs cursor-pointer flex items-center gap-1.5"
          >
            {#if creationMode === 'invite'}
              <Send class="w-3.5 h-3.5" />
              <span>ส่งคำเชิญและสร้างบัญชี</span>
            {:else}
              <span>สร้างบัญชีผู้ใช้ทันที</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Edit User Modal -->
  {#if isEditModalOpen && selectedUser}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div class="flex justify-between items-start mb-4 pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 class="text-lg font-bold text-slate-900">แก้ไขข้อมูลผู้ดูแลระบบ</h3>
            <p class="text-xs text-slate-500 mt-0.5">{selectedUser.email}</p>
          </div>
          <button
            type="button"
            onclick={() => (isEditModalOpen = false)}
            class="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form id="edit-user-form" onsubmit={handleEditUser} class="space-y-4 text-xs overflow-y-auto flex-1 pr-1 -mr-1">
          <div>
            <label for="edit-user-name" class="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล</label>
            <input
              id="edit-user-name"
              type="text"
              required
              bind:value={editFormData.fullName}
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label for="edit-user-pw" class="block font-semibold text-slate-700 mb-1">
              เปลี่ยนรหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)
            </label>
            <input
              id="edit-user-pw"
              type="password"
              bind:value={editFormData.password}
              placeholder="เว้นว่างไว้เพื่อคงรหัสผ่านเดิม"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
            />
          </div>

          <div>
            <label for="edit-user-role" class="block font-semibold text-slate-700 mb-1">ระดับสิทธิ์ (Role)</label>
            <select
              id="edit-user-role"
              bind:value={editFormData.role}
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
            >
              <option value="ADMIN">Admin (เจ้าหน้าที่ - ตรวจสอบและอนุมัติการจอง)</option>
              <option value="SUPER_ADMIN">Super Admin (สิทธิ์สูงสุด - จัดการผู้ใช้และตั้งค่า)</option>
            </select>
          </div>

          <div>
            <label for="edit-user-active" class="block font-semibold text-slate-700 mb-1">สถานะการใช้งาน</label>
            <select
              id="edit-user-active"
              value={editFormData.isActive ? 'ACTIVE' : 'INACTIVE'}
              onchange={(e) => (editFormData.isActive = (e.currentTarget as HTMLSelectElement).value === 'ACTIVE')}
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
            >
              <option value="ACTIVE">เปิดใช้งาน (ปกติ)</option>
              <option value="INACTIVE">ระงับการใช้งาน (ห้ามเข้าสู่ระบบ)</option>
            </select>
          </div>
        </form>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0 mt-2">
          <button
            type="button"
            onclick={() => (isEditModalOpen = false)}
            class="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="edit-user-form"
            class="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition active-press shadow-warm-xs cursor-pointer"
          >
            บันทึกการแก้ไข
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

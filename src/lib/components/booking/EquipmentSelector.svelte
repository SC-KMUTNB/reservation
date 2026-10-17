<script lang="ts">
  import { Building2, Users, MapPin, CheckSquare, Square } from 'lucide-svelte';
  import type { EquipmentItem } from '$lib/facility-config';

  interface Props {
    equipmentList: EquipmentItem[];
    selectedEquipment: string[];
    onToggleEquipment: (id: string) => void;
    roomName: string;
    roomLocation: string;
    maxCapacity: number;
  }

  let {
    equipmentList,
    selectedEquipment,
    onToggleEquipment,
    roomName,
    roomLocation,
    maxCapacity,
  }: Props = $props();
</script>

<div class="space-y-4">
  <!-- Room Information Banner -->
  <div class="bg-orange-50/70 border border-orange-200/90 rounded-2xl p-4 text-xs text-orange-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
    <div class="flex items-center gap-2.5">
      <div class="p-2 bg-orange-600 text-white rounded-xl shadow-xs">
        <Building2 class="w-4 h-4" />
      </div>
      <div>
        <div class="font-bold text-sm text-slate-900">{roomName}</div>
        <div class="text-slate-500 flex items-center gap-1 mt-0.5">
          <MapPin class="w-3 h-3 text-orange-600" /> {roomLocation}
        </div>
      </div>
    </div>

    <div class="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-orange-200 font-semibold text-slate-700">
      <Users class="w-3.5 h-3.5 text-orange-600" />
      <span>รองรับได้สูงสุด {maxCapacity} คน</span>
    </div>
  </div>

  <!-- Equipment Checkboxes -->
  {#if equipmentList && equipmentList.length > 0}
    <div>
      <span class="block text-xs font-bold text-slate-700 mb-2">
        อุปกรณ์ที่ต้องการยืมใช้เพิ่มเติม (เลือกได้ตามต้องการ)
      </span>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {#each equipmentList as item}
          {@const isChecked = selectedEquipment.includes(item.id)}
          <button
            type="button"
            disabled={!item.available}
            onclick={() => onToggleEquipment(item.id)}
            class="p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between cursor-pointer {!item.available
              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
              : isChecked
              ? 'bg-orange-50 border-orange-400 text-orange-900 font-semibold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}"
          >
            <span class="truncate">{item.name}</span>
            {#if isChecked}
              <CheckSquare class="w-4 h-4 text-orange-600 shrink-0 ml-2" />
            {:else}
              <Square class="w-4 h-4 text-slate-300 shrink-0 ml-2" />
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

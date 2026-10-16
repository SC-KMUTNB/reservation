'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BookingRulesModalProps {
  isOpen: boolean;
  rules: string[];
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function BookingRulesModal({
  isOpen,
  rules,
  onClose,
  onConfirm,
  isLoading,
}: BookingRulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-center border border-slate-100 text-slate-800 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div className="overflow-y-auto flex-1 pr-1 -mr-1">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-warm-xs">
            <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">กฎระเบียบการใช้ห้องประชุม</h3>
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 text-left mb-2 space-y-2.5 leading-relaxed">
            {rules && rules.length > 0 ? (
              rules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-bold shrink-0">{idx + 1}.</span>
                  <span>{rule}</span>
                </div>
              ))
            ) : (
              <p>1. ห้ามนำอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) เข้ามารับประทานในห้องประชุมเด็ดขาด<br />2. ช่วยกันรักษาความสะอาด ปิดไฟ และเครื่องปรับอากาศทุกครั้งหลังใช้งานเสร็จ</p>
            )}
          </div>
        </div>
        <div className="flex space-x-2.5 pt-4 shrink-0 border-t border-slate-100 mt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 text-xs"
          >
            ย้อนกลับ
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isLoading}
            onClick={onConfirm}
            className="flex-1 text-xs"
          >
            {isLoading ? 'กำลังบันทึก...' : 'ยอมรับและยืนยันการจอง'}
          </Button>
        </div>
      </div>
    </div>
  );
}

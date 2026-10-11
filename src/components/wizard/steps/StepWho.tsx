"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { FieldCounter, FieldLabel, inputCls } from "../FieldCounter";
import type { LetterTemplate } from "@/templates/types";

export interface WhoState {
  recipientName: string;
  nickname: string;
  specialDate: string;
  senderName: string;
  showOptional: boolean;
}

export function StepWho({
  template,
  value,
  onPatch,
}: {
  template: LetterTemplate;
  value: WhoState;
  onPatch: (p: Partial<WhoState>) => void;
}) {
  const wiz = template.wizard;
  const [a, b, c] = wiz.step1Title;
  return (
    <div className="space-y-6">
      <h1 className="font-editorial mb-2 text-[42px] leading-[1.05] text-neutral-900 sm:text-[60px]">
        {a} <em>{b}</em> {c}
      </h1>
      <div>
        <FieldLabel htmlFor="recipient" required>
          {wiz.recipientLabel}
        </FieldLabel>
        <div className="relative">
          <input
            id="recipient"
            value={value.recipientName}
            onChange={(e) => onPatch({ recipientName: e.target.value.slice(0, 150) })}
            placeholder={wiz.recipientPlaceholder}
            maxLength={150}
            className={`${inputCls} h-[50px] pr-16`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <FieldCounter value={value.recipientName.length} max={150} />
          </span>
        </div>
      </div>

      <hr className="border-[#E4E4E8]" />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
            {wiz.optionalTitle}
          </span>
          <button
            type="button"
            onClick={() => onPatch({ showOptional: !value.showOptional })}
            aria-expanded={value.showOptional}
            className="flex h-7 w-7 items-center justify-center rounded-full transition"
            style={{ color: "var(--brand)" }}
          >
            <X size={16} className={`transition-transform ${value.showOptional ? "" : "rotate-45"}`} />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {value.showOptional && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-5 pb-1">
                <div>
                  <FieldLabel htmlFor="nickname">{wiz.nicknameLabel}</FieldLabel>
                  <input
                    id="nickname"
                    value={value.nickname}
                    onChange={(e) => onPatch({ nickname: e.target.value.slice(0, 150) })}
                    placeholder={wiz.nicknamePlaceholder}
                    maxLength={150}
                    className={`${inputCls} h-[50px]`}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="specialDate">{wiz.dateLabel}</FieldLabel>
                  <input
                    id="specialDate"
                    type="date"
                    value={value.specialDate}
                    onChange={(e) => onPatch({ specialDate: e.target.value })}
                    lang="es"
                    className={`${inputCls} h-[50px]`}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="sender">{wiz.senderLabel}</FieldLabel>
                  <input
                    id="sender"
                    value={value.senderName}
                    onChange={(e) => onPatch({ senderName: e.target.value.slice(0, 150) })}
                    placeholder={wiz.senderPlaceholder}
                    maxLength={150}
                    className={`${inputCls} h-[50px]`}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

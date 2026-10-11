"use client";

export function FieldCounter({ value, max }: { value: number; max: number }) {
  const atLimit = value >= max;
  return (
    <span className={`text-[11px] font-bold tabular-nums ${atLimit ? "text-red-500" : "text-[#6B6B76]"}`}>
      {value} / {max}
    </span>
  );
}

export function FieldLabel({
  children,
  required,
  accent,
  htmlFor,
  right,
}: {
  children: React.ReactNode;
  required?: boolean;
  accent?: boolean;
  htmlFor?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className={`text-[11px] font-bold uppercase tracking-wide ${accent ? "text-[#E0698F]" : "text-[#6B6B76]"}`}
      >
        {children} {required && <span className="text-[#E0698F]">*</span>}
      </label>
      {right}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-[#D6D6DC] bg-[#EBEBEF] px-4 text-[16px] text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#E0698F] focus:ring-4 focus:ring-[#E0698F]/20";

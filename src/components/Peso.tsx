import React from 'react';
import { fmt } from '../utils/helpers';

interface PesoProps {
  value: number | string;
  className?: string;
}

export default function Peso({ value, className = '' }: PesoProps) {
  const val = Number(value || 0);
  const negative = val < 0;
  const absVal = Math.abs(val);

  return (
    <span className={`inline-grid grid-cols-[8px_18px_minmax(84px,max-content)_8px] gap-x-0.5 items-baseline justify-end font-mono text-sm text-slate-900 select-all ${className}`}>
      <span className="text-center font-normal">{negative ? '(' : ''}</span>
      <span className="text-left text-slate-400 font-medium">₱</span>
      <span className="text-right font-semibold tabular-nums">{fmt(absVal)}</span>
      <span className="text-center font-normal">{negative ? ')' : ''}</span>
    </span>
  );
}

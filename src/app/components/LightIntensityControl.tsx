'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuSun } from 'react-icons/lu';

interface Props {
  intensity: number;
  onChange: (intensity: number) => void;
}

const PANEL_WIDTH = 220;
const MIN = 0.2;
const MAX = 5.0;
const STEP = 0.1;

export default function LightIntensityControl({ intensity, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const margin = 8;
    let left = rect.right + margin;
    let top = rect.top;
    if (left + PANEL_WIDTH > window.innerWidth - margin) {
      left = rect.left - PANEL_WIDTH - margin;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - 140));
    setPos({ left, top });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const panel = open && (
    <div
      ref={panelRef}
      className="fixed z-[9999] w-[220px] p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-xl"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Brightness</span>
        <span className="text-[10px] font-mono text-[var(--text-secondary)]">{intensity.toFixed(1)}×</span>
      </div>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={STEP}
        value={intensity}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[9px] text-[var(--text-secondary)] mt-0.5">
        <span>Dim</span>
        <button
          type="button"
          onClick={() => onChange(1.0)}
          className="underline hover:text-[var(--text-primary)]"
          title="Reset to default"
        >
          Reset
        </button>
        <span>Bright</span>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Light intensity"
        className={`p-2.5 transition-colors ${intensity !== 1.0 ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'} hover:bg-[var(--secondary-bg)]`}
      >
        <LuSun className="w-4 h-4" />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}

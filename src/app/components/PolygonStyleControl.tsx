'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuPalette } from 'react-icons/lu';

interface Props {
  color: string;
  opacity: number;
  onChange: (style: { color: string; opacity: number }) => void;
}

const PRESETS = [
  '#facc15', // yellow
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#a855f7', // magenta
  '#f97316', // orange
  '#ffffff', // white
];

const PANEL_WIDTH = 240;

export default function PolygonStyleControl({ color, opacity, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ボタンの位置から popover 位置を計算（右側に出すと画面外になる場合は左側にスナップ）
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const margin = 8;
    // 右側に出す → ボタンの右隣
    let left = rect.right + margin;
    let top = rect.top;
    // 画面右側に収まらなければ左側に
    if (left + PANEL_WIDTH > window.innerWidth - margin) {
      left = rect.left - PANEL_WIDTH - margin;
    }
    // 上下クランプ
    top = Math.max(margin, Math.min(top, window.innerHeight - 260));
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
      className="fixed z-[9999] w-[240px] p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-xl"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
        Polygon color
      </div>
      <div className="grid grid-cols-8 gap-1 mb-3">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ color: c, opacity })}
            className={`w-6 h-6 rounded border ${color.toLowerCase() === c.toLowerCase() ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/40' : 'border-[var(--border)]'} transition-all`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-[var(--text-secondary)] w-12">Custom</span>
        <input
          type="color"
          value={color}
          onChange={(e) => onChange({ color: e.target.value, opacity })}
          className="h-7 w-12 rounded border border-[var(--border)] cursor-pointer bg-transparent"
        />
        <span className="text-[10px] font-mono text-[var(--text-secondary)] flex-1 truncate">{color}</span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Opacity</span>
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">{Math.round(opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.05}
          max={0.6}
          step={0.05}
          value={opacity}
          onChange={(e) => onChange({ color, opacity: Number(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Polygon style"
        className="btn-icon btn-icon-sm btn-secondary"
      >
        <LuPalette />
        <span
          className="ml-1 inline-block w-3 h-3 rounded-sm border border-white/30"
          style={{ backgroundColor: color, opacity: Math.max(opacity, 0.4) }}
        />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}

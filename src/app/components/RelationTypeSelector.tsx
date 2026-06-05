'use client';

import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import type { RelationNode } from '@/types/main';

interface Props {
  nodes: RelationNode[];           // getNodesForResource() の結果
  selected: string[];              // 選択中のプロパティ値（例: [':mentions']）
  onChange: (vals: string[]) => void;
  suggested?: Set<string>;         // ハイライトするプロパティ値（Authority のみ）
}

export default function RelationTypeSelector({ nodes, selected, onChange, suggested }: Props) {
  if (!nodes.length) return <p className="text-sm text-[var(--text-secondary)]">読み込み中...</p>;

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  return (
    <div className="flex flex-col gap-2">
      {nodes.map((topNode) => (
        <TopGroup key={topNode.id} node={topNode} selected={selected} toggle={toggle} suggested={suggested} />
      ))}
    </div>
  );
}

// Direct / Conceptual の上位グループ
function TopGroup({ node, selected, toggle, suggested }: {
  node: RelationNode;
  selected: string[];
  toggle: (v: string) => void;
  suggested?: Set<string>;
}) {
  const resourceGroup = node.children?.[0];
  const hasActive = resourceGroup ? hasSelectedInTree(resourceGroup, selected) : false;
  const [expanded, setExpanded] = useState(hasActive);
  if (!resourceGroup) return null;

  return (
    <div className={`rounded-lg border transition-colors ${hasActive ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-t-lg transition-colors ${hasActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-[var(--secondary-bg)]'}`}
      >
        <span className={`text-xs font-semibold uppercase tracking-wide ${hasActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
          {node.label}
          {node.desc && <span className="ml-2 normal-case font-normal opacity-70">— {node.desc}</span>}
          {hasActive && <span className="ml-2 normal-case font-normal">（選択中）</span>}
        </span>
        {expanded ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
      </button>
      {expanded && (
        <div className="flex flex-col gap-1 p-2 border-t border-[var(--border)]">
          {(resourceGroup.children ?? []).map((child) => (
            <RelationTreeNode
              key={child.id}
              node={child}
              depth={0}
              selected={selected}
              toggle={toggle}
              suggested={suggested}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 再帰的なツリーノード
function RelationTreeNode({ node, depth, selected, toggle, suggested }: {
  node: RelationNode;
  depth: number;
  selected: string[];
  toggle: (v: string) => void;
  suggested?: Set<string>;
}) {
  const isLeaf = !node.children || node.children.length === 0;
  const propVal = `:${node.label}`;
  const checked = selected.includes(propVal);
  const isSuggested = suggested?.has(propVal) ?? false;
  const hasActive = hasSelectedInTree(node, selected);
  const [expanded, setExpanded] = useState(hasActive);
  const [examplesOpen, setExamplesOpen] = useState(false);

  const indent = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : '';

  if (isLeaf) {
    return (
      <div className={indent}>
        <label className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
          checked
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : isSuggested
            ? 'bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-300 dark:ring-amber-700'
            : 'hover:bg-[var(--secondary-bg)]'
        }`}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggle(propVal)}
            className="mt-0.5 accent-[var(--primary)] flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium font-mono ${checked ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                {node.label}
              </span>
              {isSuggested && !checked && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">推奨</span>
              )}
            </div>
            {node.desc && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{node.desc}</p>
            )}
            {node.examples && node.examples.length > 0 && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setExamplesOpen((v) => !v); }}
                  className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                >
                  {examplesOpen ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                  例を{examplesOpen ? '閉じる' : '見る'}
                </button>
                {examplesOpen && (
                  <ul className="mt-1 ml-3 flex flex-col gap-0.5">
                    {node.examples.map((ex, i) => (
                      <li key={i} className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--secondary-bg)] px-2 py-1 rounded">
                        {ex}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </label>
      </div>
    );
  }

  // 中間ノード（グループヘッダー）
  return (
    <div className={indent}>
      <div className="mt-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
            hasActive
              ? 'text-[var(--primary)] bg-blue-100 dark:bg-blue-900/30'
              : 'text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wide">
            {node.label}
            {hasActive && <span className="ml-2 normal-case font-normal">（選択中）</span>}
          </span>
          {expanded ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
        </button>
        {node.desc && !expanded && (
          <p className="text-xs text-[var(--text-secondary)] px-2 mt-0.5">{node.desc}</p>
        )}
        {expanded && (
          <div className="mt-1 ml-3 pl-3 border-l-2 border-[var(--border)] flex flex-col gap-1">
            {node.desc && (
              <p className="text-xs text-[var(--text-secondary)] py-0.5">{node.desc}</p>
            )}
            {node.examples && node.examples.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setExamplesOpen((v) => !v); }}
                  className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                >
                  {examplesOpen ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                  例を{examplesOpen ? '閉じる' : '見る'}
                </button>
                {examplesOpen && (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {node.examples.map((ex, i) => (
                      <li key={i} className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--secondary-bg)] px-2 py-1 rounded">
                        {ex}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {(node.children ?? []).map((child) => (
              <RelationTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selected={selected}
                toggle={toggle}
                suggested={suggested}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function hasSelectedInTree(node: RelationNode, selected: string[]): boolean {
  const propVal = `:${node.label}`;
  if (selected.includes(propVal)) return true;
  return (node.children ?? []).some((c) => hasSelectedInTree(c, selected));
}

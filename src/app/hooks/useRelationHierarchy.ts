import { useState, useEffect } from 'react';
import type { RelationNode } from '@/types/main';

let cachedHierarchy: RelationNode[] | null = null;

export function useRelationHierarchy() {
  const [hierarchy, setHierarchy] = useState<RelationNode[] | null>(cachedHierarchy);

  useEffect(() => {
    if (cachedHierarchy) return;
    fetch('/ontology/relation-hierarchy.json')
      .then((r) => r.json())
      .then((d) => {
        cachedHierarchy = d.relationHierarchy as RelationNode[];
        setHierarchy(cachedHierarchy);
      })
      .catch((e) => console.error('Failed to load relation hierarchy:', e));
  }, []);

  // resourceType でフィルタしたノード一覧を返すユーティリティ
  const getNodesForResource = (resourceType: 'bibliography' | 'authority' | 'media'): RelationNode[] => {
    if (!hierarchy) return [];
    const result: RelationNode[] = [];
    for (const top of hierarchy) {
      for (const child of top.children ?? []) {
        if (child.resourceType === resourceType) {
          result.push({ ...top, children: [child] });
        }
      }
    }
    return result;
  };

  // ノードツリーから葉ノード（選択可能なプロパティ値）のラベルマップを返す
  const getLabelMap = (nodes: RelationNode[]): Record<string, string> => {
    const map: Record<string, string> = {};
    const walk = (n: RelationNode) => {
      if (!n.children || n.children.length === 0) {
        map[`:${n.label}`] = n.label;
      } else {
        for (const c of n.children) walk(c);
      }
    };
    for (const n of nodes) walk(n);
    return map;
  };

  return { hierarchy, getNodesForResource, getLabelMap };
}

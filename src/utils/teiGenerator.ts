/**
 * teiGenerator.ts
 *
 * 論文 "Text, Editions, and Spatiality" (Ogawa et al.) で提案された
 * <sourceDoc> スキーマに沿った TEI/EpiDoc XML を生成するユーティリティ。
 */

export interface RegionCoords {
  id: string;
  /** 3D座標 [x, y, z] (selector.value) */
  position: [number, number, number];
  /** 3D範囲 [x, y, z] (selector.area) */
  area: [number, number, number];
  /** カメラ位置 [x, y, z] (selector.camPos) */
  camPos: [number, number, number];
}

export interface TeiElementMapping {
  elementId: string;
  elementType: string;
  label: string;
  regionId: string | null;
}

export interface TeiElementMappingMap {
  [elementId: string]: TeiElementMapping;
}

export interface GenerateTeiOptions {
  originalXml: string;
  elementMappings: TeiElementMappingMap;
  regionCoords: Record<string, RegionCoords>;
  modelUrl: string;
}

/** lb 要素の elementId は `lb#<@n>` 形式。@n を返す */
function lbElementIdToN(elementId: string): string | null {
  if (!elementId.startsWith('lb#')) return null;
  return elementId.slice('lb#'.length);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * <lb n="N"> 単位で行を分割し、各行を <zone> で包んだXML文字列を返す。
 * Option 2 (ポリゴン/点アプローチ): 座標がある行には @points を付与。
 * elementMappings のうち elementType='lb' のものだけが zone の対象。
 * lb 以外の要素マッピングは sourceDoc には反映されず、本文側の corresp 付与で扱う。
 */
function buildZones(
  xmlDoc: Document,
  elementMappings: TeiElementMappingMap,
  regionCoords: Record<string, RegionCoords>
): string {
  const ab = xmlDoc.querySelector('div[type="edition"] ab');
  if (!ab) return '';

  const serializer = new XMLSerializer();
  const serializeNode = (node: Node): string =>
    serializer.serializeToString(node).replace(/ xmlns(?::\w+)?="[^"]*"/g, '');

  // lb の @n → mapping を引きやすくする
  const lbMappingByN: Record<string, TeiElementMapping> = {};
  for (const m of Object.values(elementMappings)) {
    if (m.elementType !== 'lb') continue;
    const n = lbElementIdToN(m.elementId);
    if (n) lbMappingByN[n] = m;
  }

  // ab の子ノードを <lb> で行単位にグループ化
  const groups: { n: string | null; nodes: Node[] }[] = [];
  let current: { n: string | null; nodes: Node[] } = { n: null, nodes: [] };

  for (const node of Array.from(ab.childNodes)) {
    if (node.nodeName === 'lb') {
      if (current.n !== null || current.nodes.length > 0) groups.push(current);
      current = { n: (node as Element).getAttribute('n'), nodes: [] };
    } else {
      current.nodes.push(node);
    }
  }
  if (current.n !== null || current.nodes.length > 0) groups.push(current);

  let result = '';

  for (const group of groups) {
    const { n, nodes } = group;
    const innerXml = nodes.map(serializeNode).join('').trim();

    if (n === null) {
      if (innerXml) result += `        ${innerXml}\n`;
      continue;
    }

    const mapping = lbMappingByN[n];
    const coords = mapping?.regionId ? regionCoords[mapping.regionId] : undefined;

    let pointsAttr = '';
    let correspAttr = '';
    if (coords) {
      const [cx, cy, cz] = coords.position;
      const [ax, ay, az] = coords.area;
      const pts: [number, number, number][] = [
        [cx - ax, cy - ay, cz - az],
        [cx + ax, cy - ay, cz - az],
        [cx + ax, cy + ay, cz + az],
        [cx - ax, cy + ay, cz + az],
      ];
      pointsAttr = ` points="${pts.map((p) => p.map((v) => +v.toFixed(4)).join(',')).join(' ')}"`;
      correspAttr = ` corresp="#${escapeXml(mapping.regionId!)}"`;
    }

    result += `        <zone type="line" n="${escapeXml(n)}"${pointsAttr}${correspAttr}>\n`;
    result += `          <lb n="${escapeXml(n)}"/>\n`;
    if (innerXml) result += `          ${innerXml}\n`;
    result += `        </zone>\n`;
  }

  return result;
}

export function generateSourceDocTei(options: GenerateTeiOptions): string {
  const { originalXml, elementMappings, regionCoords, modelUrl } = options;

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(originalXml, 'application/xml');

  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('XML parse error');
  }

  const serializer = new XMLSerializer();
  const stripNs = (s: string) => s.replace(/ xmlns(?::\w+)?="[^"]*"/g, '');

  const teiHeaderEl = xmlDoc.querySelector('teiHeader');
  const teiHeaderXml = teiHeaderEl ? stripNs(serializer.serializeToString(teiHeaderEl)) : '';

  const textEl = xmlDoc.querySelector('text');
  const textXml = textEl ? stripNs(serializer.serializeToString(textEl)) : '';

  const zones = buildZones(xmlDoc, elementMappings, regionCoords);

  const teiEl = xmlDoc.querySelector('TEI');
  const teiAttrs = teiEl
    ? Array.from(teiEl.attributes).map((a) => ` ${a.name}="${escapeXml(a.value)}"`).join('')
    : ' xmlns="http://www.tei-c.org/ns/1.0"';

  const sourceDoc = `  <sourceDoc>
    <surface>
      <graphic url="${escapeXml(modelUrl)}"/>
      <zone type="text">
${zones}      </zone>
    </surface>
  </sourceDoc>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-model href="http://www.stoa.org/epidoc/schema/latest/tei-epidoc.rng" schematypens="http://relaxng.org/ns/structure/1.0"?>
<TEI${teiAttrs}>
${teiHeaderXml}
${sourceDoc}
${textXml}
</TEI>
`;
}

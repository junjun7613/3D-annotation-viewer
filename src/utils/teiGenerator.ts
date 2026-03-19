/**
 * teiGenerator.ts
 *
 * 論文 "Text, Editions, and Spatiality" (Ogawa et al.) で提案された
 * <sourceDoc> スキーマに沿った TEI/EpiDoc XML を生成するユーティリティ。
 */

export interface AnnotationCoords {
  id: string;
  label: string;
  /** 3D座標 [x, y, z] (selector.value) */
  position: [number, number, number];
  /** 3D範囲 [x, y, z] (selector.area) */
  area: [number, number, number];
  /** カメラ位置 [x, y, z] (selector.camPos) */
  camPos: [number, number, number];
}

export interface TeiLineMapping {
  lineNumber: string;
  lineText: string;
  annotationId: string | null;
}

export interface TeiLineMappingMap {
  [lineNumber: string]: TeiLineMapping;
}

export interface GenerateTeiOptions {
  originalXml: string;
  lineMappings: TeiLineMappingMap;
  annotationCoords: Record<string, AnnotationCoords>;
  modelUrl: string;
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
 */
function buildZones(
  xmlDoc: Document,
  lineMappings: TeiLineMappingMap,
  annotationCoords: Record<string, AnnotationCoords>
): string {
  const ab = xmlDoc.querySelector('div[type="edition"] ab');
  if (!ab) return '';

  const serializer = new XMLSerializer();
  const serializeNode = (node: Node): string =>
    serializer.serializeToString(node).replace(/ xmlns(?::\w+)?="[^"]*"/g, '');

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

    const mapping = lineMappings[n];
    const coords = mapping?.annotationId ? annotationCoords[mapping.annotationId] : undefined;

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
      correspAttr = ` corresp="#${escapeXml(mapping.annotationId!)}"`;
    }

    result += `        <zone type="line" n="${escapeXml(n)}"${pointsAttr}${correspAttr}>\n`;
    result += `          <lb n="${escapeXml(n)}"/>\n`;
    if (innerXml) result += `          ${innerXml}\n`;
    result += `        </zone>\n`;
  }

  return result;
}

export function generateSourceDocTei(options: GenerateTeiOptions): string {
  const { originalXml, lineMappings, annotationCoords, modelUrl } = options;

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

  const zones = buildZones(xmlDoc, lineMappings, annotationCoords);

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

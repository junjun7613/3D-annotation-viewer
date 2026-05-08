import EditorJSHtml from 'editorjs-html';
import type { BibliographyItem, MediaItem, WikidataItem, ObjectMetadata, NewAnnotation } from '@/types/main';

const parser = EditorJSHtml();

// 書誌役割種別からCRMプロパティを導出
// PrimarySource / SurveyReport → P70_documents（一次記録）
// ResearchLiterature → P67_refers_to（言及・参照）
// 既存データの後方互換: property フィールドをそのまま使用
function bibConnectionProp(item: BibliographyItem): string {
  if (item.property) return item.property;
  if (item.roleType === ':ResearchLiterature') return 'crm:P67_refers_to';
  return 'crm:P70_documents';
}

// メディア役割種別からCRMプロパティを導出
// ObjectMedia → P138_represents（同一物の別表現）
// ExplanatoryMedia / ContextualMedia → P70_documents（記録・文書化）
function mediaConnectionProp(item: MediaItem): string {
  const role = item.roleType ?? ':ObjectMedia';
  if (role === ':ObjectMedia') return 'crm:P138_represents';
  return 'crm:P70_documents';
}

export function buildTurtle(
  manifestId: string,
  annotations: NewAnnotation[],
  objectMetadata: ObjectMetadata | null
): string {
  const manifestBase = manifestId.split('/').slice(0, -1).join('/');
  const annoBase = `${manifestBase}/annotation`;
  const mediaBase = `${manifestBase}/media`;
  const bibBase = `${manifestBase}/bibliography`;

  let ttl =
    '@prefix : <https://www.example.com/vocabulary/> .\n' +
    '@prefix schema: <https://schema.org/> .\n' +
    '@prefix dc: <http://purl.org/dc/elements/1.1/> .\n' +
    '@prefix geo: <http://www.w3.org/2003/01/geo/wgs84_pos#> .\n' +
    '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n' +
    '@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n' +
    '@prefix crm: <http://www.cidoc-crm.org/cidoc-crm/> .\n' +
    '@prefix oa: <http://www.w3.org/ns/oa#> .\n' +
    '@prefix prov: <http://www.w3.org/ns/prov#> .\n' +
    '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n' +
    '@prefix bibo: <http://purl.org/ontology/bibo/> .\n' +
    '@prefix dcterms: <http://purl.org/dc/terms/> .\n';

  // 語彙定義（将来的には別ファイルで公開）
  ttl += '\n# -- Vocabulary definitions --\n';

  // 典拠データソース種別（crm:P2_has_type の値）
  ttl += ':AuthorityData a crm:E55_Type .\n';
  ttl += ':WikidataAuthority a crm:E55_Type ;\n  rdfs:subClassOf :AuthorityData .\n';
  ttl += ':GeonamesAuthority a crm:E55_Type ;\n  rdfs:subClassOf :AuthorityData .\n';

  // メディアクラス階層
  ttl += ':MediaFormatType a rdfs:Class .\n';
  ttl += ':MediaRoleType a rdfs:Class .\n';
  ttl += 'schema:ImageObject rdfs:subClassOf :MediaFormatType .\n';
  ttl += 'schema:VideoObject rdfs:subClassOf :MediaFormatType .\n';
  ttl += 'schema:3DModel rdfs:subClassOf :MediaFormatType .\n';
  ttl += ':IIIFManifest rdfs:subClassOf :MediaFormatType .\n';
  ttl += ':ObjectMedia rdfs:subClassOf :MediaRoleType .\n';
  ttl += ':ExplanatoryMedia rdfs:subClassOf :MediaRoleType .\n';
  ttl += ':ContextualMedia rdfs:subClassOf :MediaRoleType .\n';

  // 書誌クラス階層
  ttl += ':BibliographyRoleType a rdfs:Class .\n';
  ttl += ':PrimarySource rdfs:subClassOf :BibliographyRoleType .\n';
  ttl += ':ResearchLiterature rdfs:subClassOf :BibliographyRoleType .\n';
  ttl += ':SurveyReport rdfs:subClassOf :BibliographyRoleType .\n';

  // 典拠役割クラス階層
  ttl += ':AuthorityRoleType a rdfs:Class .\n';
  ttl += ':ObjectAuthority rdfs:subClassOf :AuthorityRoleType .\n';
  ttl += ':GeographicAuthority rdfs:subClassOf :AuthorityRoleType .\n';
  ttl += ':DepictedPlace rdfs:subClassOf :GeographicAuthority .\n';
  ttl += ':RelatedPlace rdfs:subClassOf :GeographicAuthority .\n';
  ttl += ':FoundAt rdfs:subClassOf :RelatedPlace .\n';
  ttl += ':ProducedAt rdfs:subClassOf :RelatedPlace .\n';
  ttl += ':OriginatedAt rdfs:subClassOf :RelatedPlace .\n';
  ttl += ':DepictedAt rdfs:subClassOf :RelatedPlace .\n';

  // 参照レベル
  ttl += ':DirectReference a crm:E55_Type .\n';
  ttl += ':IndirectReference a crm:E55_Type .\n';

  if (objectMetadata) {
    ttl += `\n<${manifestId}> a :Manifest ;\n`;
    const manifestProps: string[] = [];

    (objectMetadata.wikidata ?? []).forEach((item) => {
      manifestProps.push(`  crm:P67_refers_to <${item.uri}>`);
    });
    // media・bibliography は各リソース側を主語にするため manifestProps には追加しない
    if (objectMetadata.location) {
      manifestProps.push(`  geo:lat "${objectMetadata.location.lat}"`);
      manifestProps.push(`  geo:long "${objectMetadata.location.lng}"`);
    }

    if (manifestProps.length > 0) {
      manifestProps.forEach((p, i) => {
        ttl += p + (i < manifestProps.length - 1 ? ' ;\n' : ' .\n');
      });
    } else {
      ttl += '.\n';
    }

    // Wikidata entities (object level)
    (objectMetadata.wikidata ?? []).forEach((item: WikidataItem) => {
      const authorityType = item.type === 'geonames' ? ':GeonamesAuthority' : ':WikidataAuthority';
      const roleType = item.roleType ?? ':ObjectAuthority';
      const refLevel = item.referenceLevel ?? ':DirectReference';
      const ps: string[] = [];
      ps.push(`  crm:P2_has_type ${authorityType}`);
      ps.push(`  a ${roleType}`);
      ps.push(`  :referenceLevel ${refLevel}`);
      ps.push(`  rdfs:label "${item.label}"`);
      if (item.lat && item.lng) {
        ps.push(`  geo:lat "${item.lat}"`);
        ps.push(`  geo:long "${item.lng}"`);
      }
      if (item.thumbnail) ps.push(`  foaf:depiction <${item.thumbnail}>`);
      if (item.wikipedia) ps.push(`  rdfs:seeAlso <${item.wikipedia}>`);
      ttl += `\n<${item.uri}>\n`;
      ps.forEach((p, i) => { ttl += p + (i < ps.length - 1 ? ' ;\n' : ' .\n'); });
    });

    // Object media（メディアが主語）
    (objectMetadata.media ?? []).forEach((item: MediaItem) => {
      const role = item.roleType ?? ':ObjectMedia';
      const refLevel = item.referenceLevel ?? ':DirectReference';
      const connProp = mediaConnectionProp(item);
      ttl += `\n<${mediaBase}/object-${item.id}> a ${mediaClass(item.type)}, ${role} ;\n`;
      ttl += `  :referenceLevel ${refLevel} ;\n`;
      ttl += `  ${connProp} <${manifestId}> ;\n`;
      ttl += `  schema:description "${item.caption}"`;
      if (item.type === 'iiif' && item.manifestUrl) {
        ttl += ` ;\n  :iiifManifest <${item.manifestUrl}>`;
        if (item.canvasId) ttl += ` ;\n  :iiifCanvas <${item.canvasId}>`;
      }
      if (item.type === 'sketchfab' && item.manifestUrl) {
        ttl += ` ;\n  :sketchfabUrl <${item.manifestUrl}>`;
        if (item.canvasId) ttl += ` ;\n  :sketchfabModelId "${item.canvasId}"`;
      }
      ttl += ' .\n';
    });

    // Object bibliography（文書が主語）
    (objectMetadata.bibliography ?? []).forEach((item: BibliographyItem) => {
      const roleType = item.roleType ?? ':PrimarySource';
      const refLevel = item.referenceLevel ?? ':DirectReference';
      const connProp = bibConnectionProp(item);
      ttl += `\n<${bibBase}/object-${item.id}> a crm:E31_Document, ${roleType} ;\n`;
      ttl += `  :referenceLevel ${refLevel} ;\n`;
      const bibProps = buildBibProps(item);
      if (bibProps) {
        ttl += `  ${connProp} <${manifestId}> ;\n`;
        ttl += bibProps;
      } else {
        ttl += `  ${connProp} <${manifestId}> .\n`;
      }
    });
  }

  // Annotations
  annotations
    .filter((ann) => ann.target_manifest === manifestId)
    .forEach((ann) => {
      const cleanedBody = JSON.parse(JSON.stringify(ann.data?.body?.value || { blocks: [] }));
      const html = parser.parse(cleanedBody);

      ttl += `\n<${annoBase}/${ann.id}> a oa:Annotation ;\n`;
      const ps: string[] = [];
      ps.push(`  rdfs:label "${ann.data?.body?.label ?? ''}"`);
      ps.push(`  schema:description "${html}"`);
      const target = ann.target_canvas
        ? `<${ann.target_canvas}>`
        : `<${ann.target_manifest}>`;
      ps.push(`  oa:hasTarget ${target}`);
      if (ann.creator) ps.push(`  prov:wasAttributedTo <urn:uid:${ann.creator}>`);
      if (ann.createdAt) {
        const iso = new Date(ann.createdAt).toISOString();
        ps.push(`  prov:generatedAtTime "${iso}"^^xsd:dateTime`);
      }
      (ann.wikidata as WikidataItem[] ?? []).forEach((item) => {
        ps.push(`  crm:P67_refers_to <${item.uri}>`);
      });
      // media・bibliography はリソース側を主語にするため annotation triple には追加しない

      if (ps.length > 0) {
        ps.forEach((p, i) => { ttl += p + (i < ps.length - 1 ? ' ;\n' : ' .\n'); });
      } else {
        ttl += '.\n';
      }

      // Annotation media（メディアが主語）
      (ann.media as MediaItem[] ?? []).forEach((item) => {
        const role = item.roleType ?? ':ObjectMedia';
        const refLevel = item.referenceLevel ?? ':DirectReference';
        const connProp = mediaConnectionProp(item);
        ttl += `\n<${mediaBase}/${item.id}> a ${mediaClass(item.type)}, ${role} ;\n`;
        ttl += `  :referenceLevel ${refLevel} ;\n`;
        ttl += `  ${connProp} <${annoBase}/${ann.id}> ;\n`;
        ttl += `  schema:description "${item.caption}"`;
        if (item.type === 'iiif' && item.manifestUrl) {
          ttl += ` ;\n  :iiifManifest <${item.manifestUrl}>`;
          if (item.canvasId) ttl += ` ;\n  :iiifCanvas <${item.canvasId}>`;
        }
        if (item.type === 'sketchfab' && item.manifestUrl) {
          ttl += ` ;\n  :sketchfabUrl <${item.manifestUrl}>`;
          if (item.canvasId) ttl += ` ;\n  :sketchfabModelId "${item.canvasId}"`;
        }
        ttl += ' .\n';
      });

      // Annotation Wikidata entity descriptions
      (ann.wikidata as WikidataItem[] ?? []).forEach((item) => {
        const authorityType = item.type === 'geonames' ? ':GeonamesAuthority' : ':WikidataAuthority';
        const roleType = item.roleType ?? ':ObjectAuthority';
        const refLevel = item.referenceLevel ?? ':DirectReference';
        const ps: string[] = [];
        ps.push(`  crm:P2_has_type ${authorityType}`);
        ps.push(`  a ${roleType}`);
        ps.push(`  :referenceLevel ${refLevel}`);
        ps.push(`  rdfs:label "${item.label}"`);
        if (item.lat && item.lng) {
          ps.push(`  geo:lat "${item.lat}"`);
          ps.push(`  geo:long "${item.lng}"`);
        }
        if (item.thumbnail) ps.push(`  foaf:depiction <${item.thumbnail}>`);
        if (item.wikipedia) ps.push(`  rdfs:seeAlso <${item.wikipedia}>`);
        ttl += `\n<${item.uri}>\n`;
        ps.forEach((p, i) => { ttl += p + (i < ps.length - 1 ? ' ;\n' : ' .\n'); });
      });

      // Annotation bibliography（文書が主語）
      (ann.bibliography as BibliographyItem[] ?? []).forEach((item) => {
        const roleType = item.roleType ?? ':PrimarySource';
        const refLevel = item.referenceLevel ?? ':DirectReference';
        const connProp = bibConnectionProp(item);
        ttl += `\n<${bibBase}/${item.id}> a crm:E31_Document, ${roleType} ;\n`;
        ttl += `  :referenceLevel ${refLevel} ;\n`;
        const bibProps = buildBibProps(item);
        if (bibProps) {
          ttl += `  ${connProp} <${annoBase}/${ann.id}> ;\n`;
          ttl += bibProps;
        } else {
          ttl += `  ${connProp} <${annoBase}/${ann.id}> .\n`;
        }
      });
    });

  return ttl;
}

function mediaClass(type: string): string {
  if (type === 'img') return 'schema:ImageObject';
  if (type === 'video') return 'schema:VideoObject';
  if (type === 'sketchfab') return 'schema:3DModel';
  return ':IIIFManifest';
}

function buildBibProps(item: BibliographyItem): string {
  const ps: string[] = [];
  if (item.author) ps.push(`  dc:creator "${item.author}"`);
  if (item.title) ps.push(`  dc:title "${item.title}"`);
  if (item.year) ps.push(`  dc:date "${item.year}"`);
  if (item.containerTitle) ps.push(`  dcterms:isPartOf "${item.containerTitle}"`);
  if (item.volume) ps.push(`  bibo:volume "${item.volume}"`);
  if (item.issue) ps.push(`  bibo:issue "${item.issue}"`);
  if (item.pages) ps.push(`  bibo:pages "${item.pages}"`);
  if (item.publisher) ps.push(`  dc:publisher "${item.publisher}"`);
  if (item.doi) ps.push(`  bibo:doi "${item.doi}"`);
  if (item.page) ps.push(`  schema:url <${item.page}>`);
  if (item.pdf) ps.push(`  schema:contentUrl <${item.pdf}>`);
  let out = '';
  ps.forEach((p, i) => { out += p + (i === ps.length - 1 ? ' .\n' : ' ;\n'); });
  return out;
}

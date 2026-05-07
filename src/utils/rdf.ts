import EditorJSHtml from 'editorjs-html';
import type { BibliographyItem, MediaItem, WikidataItem, ObjectMetadata, NewAnnotation } from '@/types/main';

const parser = EditorJSHtml();

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

  ttl += '\n:AuthorityData a crm:E55_Type .\n';
  ttl += ':WikidataAuthority a crm:E55_Type ;\n  rdfs:subClassOf :AuthorityData .\n';
  ttl += ':GeonamesAuthority a crm:E55_Type ;\n  rdfs:subClassOf :AuthorityData .\n';

  if (objectMetadata) {
    ttl += `\n<${manifestId}> a :Manifest ;\n`;
    const manifestProps: string[] = [];

    (objectMetadata.wikidata ?? []).forEach((item) => {
      const prop = item.property ?? 'crm:P138_represents';
      manifestProps.push(`  ${prop} <${item.uri}>`);
    });
    (objectMetadata.media ?? []).forEach((item) => {
      manifestProps.push(`  :media <${mediaBase}/object-${item.id}>`);
    });
    // bibliography は文書側を主語にするため manifestProps には追加しない
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

    // Wikidata entities
    (objectMetadata.wikidata ?? []).forEach((item: WikidataItem) => {
      const ps: string[] = [];
      const authorityType = item.type === 'geonames' ? ':GeonamesAuthority' : ':WikidataAuthority';
      ps.push(`  crm:P2_has_type ${authorityType}`);
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

    // Object media
    (objectMetadata.media ?? []).forEach((item: MediaItem) => {
      ttl += `\n<${mediaBase}/object-${item.id}> a ${mediaClass(item.type)} ;\n`;
      ttl += `  schema:uri "${item.source}" ;\n`;
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

    // Object bibliography (文書が主語)
    (objectMetadata.bibliography ?? []).forEach((item: BibliographyItem) => {
      const prop = item.property ?? 'crm:P70_documents';
      ttl += `\n<${bibBase}/object-${item.id}> a crm:E31_Document ;\n`;
      const bibProps = buildBibProps(item);
      if (bibProps) {
        ttl += `  ${prop} <${manifestId}> ;\n`;
        ttl += bibProps;
      } else {
        ttl += `  ${prop} <${manifestId}> .\n`;
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
      // oa:hasTarget: canvas fragment
      const target = ann.target_canvas
        ? `<${ann.target_canvas}>`
        : `<${ann.target_manifest}>`;
      ps.push(`  oa:hasTarget ${target}`);
      // PROV: 作成者・作成日時
      if (ann.creator) ps.push(`  prov:wasAttributedTo <urn:uid:${ann.creator}>`);
      if (ann.createdAt) {
        const iso = new Date(ann.createdAt).toISOString();
        ps.push(`  prov:generatedAtTime "${iso}"^^xsd:dateTime`);
      }

      (ann.wikidata as WikidataItem[] ?? []).forEach((item) => {
        const prop = item.property ?? 'crm:P138_represents';
        ps.push(`  ${prop} <${item.uri}>`);
      });
      (ann.media as MediaItem[] ?? []).forEach((item) => {
        ps.push(`  :media <${mediaBase}/${item.id}>`);
      });
      // bibliography は文書側を主語にするため annotation triple には追加しない

      if (ps.length > 0) {
        ps.forEach((p, i) => { ttl += p + (i < ps.length - 1 ? ' ;\n' : ' .\n'); });
      } else {
        ttl += '.\n';
      }

      // Annotation media
      (ann.media as MediaItem[] ?? []).forEach((item) => {
        ttl += `\n<${mediaBase}/${item.id}> a ${mediaClass(item.type)} ;\n`;
        ttl += `  schema:uri "${item.source}" ;\n`;
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
        const ps: string[] = [];
        ps.push(`  crm:P2_has_type ${authorityType}`);
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

      // Annotation bibliography (文書が主語)
      (ann.bibliography as BibliographyItem[] ?? []).forEach((item) => {
        const prop = item.property ?? 'crm:P70_documents';
        ttl += `\n<${bibBase}/${item.id}> a crm:E31_Document ;\n`;
        const bibProps = buildBibProps(item);
        if (bibProps) {
          ttl += `  ${prop} <${annoBase}/${ann.id}> ;\n`;
          ttl += bibProps;
        } else {
          ttl += `  ${prop} <${annoBase}/${ann.id}> .\n`;
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

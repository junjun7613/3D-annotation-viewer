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
    '@prefix crm: <http://www.cidoc-crm.org/cidoc-crm/> .\n';

  if (objectMetadata) {
    ttl += `\n<${manifestId}> a :Manifest ;\n`;
    const manifestProps: string[] = [];

    (objectMetadata.wikidata ?? []).forEach((item) => {
      manifestProps.push(`  :relatedEntity <${item.uri}>`);
    });
    (objectMetadata.media ?? []).forEach((item) => {
      manifestProps.push(`  :media <${mediaBase}/object-${item.id}>`);
    });
    (objectMetadata.bibliography ?? []).forEach((item) => {
      const prop = item.property ?? 'crm:P67_refers_to';
      manifestProps.push(`  ${prop} <${bibBase}/object-${item.id}>`);
    });
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
      ttl += `\n<${item.uri}> a :WikidataEntity ;\n`;
      const ps: string[] = [];
      ps.push(`  rdfs:label "${item.label}"`);
      ps.push(`  :wikidataType "${item.type}"`);
      if (item.lat && item.lng) {
        ps.push(`  geo:lat "${item.lat}"`);
        ps.push(`  geo:long "${item.lng}"`);
      }
      if (item.thumbnail) ps.push(`  foaf:depiction <${item.thumbnail}>`);
      if (item.wikipedia) ps.push(`  rdfs:seeAlso <${item.wikipedia}>`);
      ps.forEach((p, i) => { ttl += p + (i < ps.length - 1 ? ' ;\n' : ' .\n'); });
    });

    // Object media
    (objectMetadata.media ?? []).forEach((item: MediaItem) => {
      ttl += `\n<${mediaBase}/object-${item.id}> a :Media ;\n`;
      ttl += `  schema:uri "${item.source}" ;\n`;
      ttl += `  schema:description "${item.caption}" ;\n`;
      ttl += `  schema:additionalType :${item.type}`;
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

    // Object bibliography
    (objectMetadata.bibliography ?? []).forEach((item: BibliographyItem) => {
      ttl += `\n<${bibBase}/object-${item.id}> a :Bibliography ;\n`;
      ttl += buildBibProps(item);
    });
  }

  // Annotations
  annotations
    .filter((ann) => ann.target_manifest === manifestId)
    .forEach((ann) => {
      const cleanedBody = JSON.parse(JSON.stringify(ann.data?.body?.value || { blocks: [] }));
      const html = parser.parse(cleanedBody);

      ttl += `\n<${annoBase}/${ann.id}> a :Annotation ;\n`;
      const ps: string[] = [];
      ps.push(`  rdfs:label "${ann.data?.body?.label ?? ''}"`);
      ps.push(`  schema:description "${html}"`);
      ps.push(`  :targetManifest <${ann.target_manifest}>`);
      ps.push(`  :targetCanvas <${ann.target_canvas}>`);

      (ann.wikidata as WikidataItem[] ?? []).forEach((item) => {
        ps.push(`  :wikidata <${item.uri}>`);
      });
      (ann.media as MediaItem[] ?? []).forEach((item) => {
        ps.push(`  :media <${mediaBase}/${item.id}>`);
      });
      (ann.bibliography as BibliographyItem[] ?? []).forEach((item) => {
        const prop = item.property ?? 'crm:P67_refers_to';
        ps.push(`  ${prop} <${bibBase}/${item.id}>`);
      });

      if (ps.length > 0) {
        ps.forEach((p, i) => { ttl += p + (i < ps.length - 1 ? ' ;\n' : ' .\n'); });
      } else {
        ttl += '.\n';
      }

      // Annotation media
      (ann.media as MediaItem[] ?? []).forEach((item) => {
        ttl += `\n<${mediaBase}/${item.id}> a :Media ;\n`;
        ttl += `  schema:uri "${item.source}" ;\n`;
        ttl += `  schema:description "${item.caption}" ;\n`;
        ttl += `  schema:additionalType :${item.type}`;
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

      // Annotation bibliography
      (ann.bibliography as BibliographyItem[] ?? []).forEach((item) => {
        ttl += `\n<${bibBase}/${item.id}> a :Bibliography ;\n`;
        ttl += buildBibProps(item);
      });
    });

  return ttl;
}

function buildBibProps(item: BibliographyItem): string {
  const ps: string[] = [];
  if (item.author) ps.push(`  dc:creator "${item.author}"`);
  if (item.title) ps.push(`  dc:title "${item.title}"`);
  if (item.year) ps.push(`  dc:date "${item.year}"`);
  if (item.containerTitle) ps.push(`  dc:isPartOf "${item.containerTitle}"`);
  if (item.volume) ps.push(`  schema:volumeNumber "${item.volume}"`);
  if (item.issue) ps.push(`  schema:issueNumber "${item.issue}"`);
  if (item.pages) ps.push(`  schema:pagination "${item.pages}"`);
  if (item.publisher) ps.push(`  dc:publisher "${item.publisher}"`);
  if (item.doi) ps.push(`  :doi "${item.doi}"`);
  if (item.page) ps.push(`  schema:url <${item.page}>`);
  if (item.pdf) ps.push(`  schema:contentUrl <${item.pdf}>`);
  let out = '';
  ps.forEach((p, i) => { out += p + (i === ps.length - 1 ? ' .\n' : ' ;\n'); });
  return out;
}

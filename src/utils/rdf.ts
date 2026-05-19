import EditorJSHtml from 'editorjs-html';
import type { BibliographyItem, MediaItem, WikidataItem, ObjectMetadata, NewAnnotation } from '@/types/main';

const parser = EditorJSHtml();

const PREFIXES =
  '@prefix : <https://www.example.com/vocabulary/> .\n' +
  '@prefix schema: <https://schema.org/> .\n' +
  '@prefix dc: <http://purl.org/dc/elements/1.1/> .\n' +
  '@prefix geo: <http://www.w3.org/2003/01/geo/wgs84_pos#> .\n' +
  '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n' +
  '@prefix owl: <http://www.w3.org/2002/07/owl#> .\n' +
  '@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n' +
  '@prefix crm: <http://www.cidoc-crm.org/cidoc-crm/> .\n' +
  '@prefix oa: <http://www.w3.org/ns/oa#> .\n' +
  '@prefix prov: <http://www.w3.org/ns/prov#> .\n' +
  '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n' +
  '@prefix bibo: <http://purl.org/ontology/bibo/> .\n' +
  '@prefix dcterms: <http://purl.org/dc/terms/> .\n' +
  '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n';

const VOCAB_DEFINITIONS =
  '\n# -- Vocabulary definitions --\n' +
  // 典拠データソース種別
  ':AuthorityData a crm:E55_Type .\n' +
  ':WikidataAuthority a crm:E55_Type ;\n  rdfs:subClassOf :AuthorityData .\n' +
  ':GeonamesAuthority a crm:E55_Type ;\n  rdfs:subClassOf :AuthorityData .\n' +
  // 役割種別の共通上位クラス
  ':ResourceRoleType a rdfs:Class .\n' +
  // メディアクラス階層
  ':MediaFormatType a rdfs:Class .\n' +
  ':MediaRoleType a rdfs:Class ;\n  rdfs:subClassOf :ResourceRoleType .\n' +
  'schema:ImageObject rdfs:subClassOf :MediaFormatType .\n' +
  'schema:VideoObject rdfs:subClassOf :MediaFormatType .\n' +
  'schema:3DModel rdfs:subClassOf :MediaFormatType .\n' +
  ':IIIFManifest rdfs:subClassOf :MediaFormatType .\n' +
  ':ObjectMedia rdfs:subClassOf :MediaRoleType .\n' +
  ':ExplanatoryMedia rdfs:subClassOf :MediaRoleType .\n' +
  ':ContextualMedia rdfs:subClassOf :MediaRoleType .\n' +
  // 書誌クラス階層
  ':BibliographyRoleType a rdfs:Class ;\n  rdfs:subClassOf :ResourceRoleType .\n' +
  ':PrimarySource rdfs:subClassOf :BibliographyRoleType .\n' +
  ':ResearchLiterature rdfs:subClassOf :BibliographyRoleType .\n' +
  ':SurveyReport rdfs:subClassOf :BibliographyRoleType .\n' +
  // 書誌関係性プロパティ階層
  ':BibliographicRelation a rdf:Property .\n' +
  ':DirectBibliographicRelation rdfs:subPropertyOf :BibliographicRelation .\n' +
  ':ConceptualBibliographicRelation rdfs:subPropertyOf :BibliographicRelation .\n' +
  ':mentions rdfs:subPropertyOf :DirectBibliographicRelation .\n' +
  ':describes rdfs:subPropertyOf :DirectBibliographicRelation .\n' +
  ':reports rdfs:subPropertyOf :describes .\n' +
  ':analyzes rdfs:subPropertyOf :describes .\n' +
  ':catalogues rdfs:subPropertyOf :describes .\n' +
  ':illustrates rdfs:subPropertyOf :DirectBibliographicRelation .\n' +
  ':TextualRelation rdfs:subPropertyOf :DirectBibliographicRelation .\n' +
  ':transcribes rdfs:subPropertyOf :TextualRelation .\n' +
  ':translates rdfs:subPropertyOf :TextualRelation .\n' +
  ':contextualizes rdfs:subPropertyOf :ConceptualBibliographicRelation .\n' +
  ':discusses_related_concept rdfs:subPropertyOf :ConceptualBibliographicRelation .\n' +
  ':compares_with rdfs:subPropertyOf :ConceptualBibliographicRelation .\n' +
  ':provides_typology rdfs:subPropertyOf :ConceptualBibliographicRelation .\n' +
  ':relevant_to_period rdfs:subPropertyOf :ConceptualBibliographicRelation .\n' +
  ':relevant_to_region rdfs:subPropertyOf :ConceptualBibliographicRelation .\n' +
  ':associated_with_person rdfs:subPropertyOf :ConceptualBibliographicRelation .\n' +
  // 典拠関係性プロパティ階層
  ':AuthorityRelation a rdf:Property .\n' +
  ':DirectAuthorityRelation rdfs:subPropertyOf :AuthorityRelation .\n' +
  ':ConceptualAuthorityRelation rdfs:subPropertyOf :AuthorityRelation .\n' +
  ':identifies rdfs:subPropertyOf :DirectAuthorityRelation .\n' +
  ':DepictionRelation rdfs:subPropertyOf :DirectAuthorityRelation .\n' +
  ':depicts_object rdfs:subPropertyOf :DepictionRelation .\n' +
  ':depicts_person rdfs:subPropertyOf :DepictionRelation .\n' +
  ':depicts_place rdfs:subPropertyOf :DepictionRelation .\n' +
  ':depicts_event rdfs:subPropertyOf :DepictionRelation .\n' +
  ':TextualReferenceRelation rdfs:subPropertyOf :DirectAuthorityRelation .\n' +
  ':mentions_person rdfs:subPropertyOf :TextualReferenceRelation .\n' +
  ':mentions_place rdfs:subPropertyOf :TextualReferenceRelation .\n' +
  ':mentions_event rdfs:subPropertyOf :TextualReferenceRelation .\n' +
  ':ContextualRelation rdfs:subPropertyOf :ConceptualAuthorityRelation .\n' +
  ':associated_with_period rdfs:subPropertyOf :ContextualRelation .\n' +
  ':associated_with_region rdfs:subPropertyOf :ContextualRelation .\n' +
  ':associated_with_person rdfs:subPropertyOf :ContextualRelation .\n' +
  ':associated_with_culture rdfs:subPropertyOf :ContextualRelation .\n' +
  ':ConceptualComparison rdfs:subPropertyOf :ConceptualAuthorityRelation .\n' +
  ':compared_with rdfs:subPropertyOf :ConceptualComparison .\n' +
  ':related_to_concept rdfs:subPropertyOf :ConceptualComparison .\n' +
  ':ClassificationRelation rdfs:subPropertyOf :ConceptualAuthorityRelation .\n' +
  ':classified_as rdfs:subPropertyOf :ClassificationRelation .\n' +
  ':has_type rdfs:subPropertyOf :ClassificationRelation .\n' +
  ':LinguisticRelation rdfs:subPropertyOf :ConceptualAuthorityRelation .\n' +
  ':written_in_language rdfs:subPropertyOf :LinguisticRelation .\n' +
  ':uses_script rdfs:subPropertyOf :LinguisticRelation .\n' +
  ':EventRelation rdfs:subPropertyOf :ConceptualAuthorityRelation .\n' +
  ':created_by rdfs:subPropertyOf :EventRelation .\n' +
  ':discovered_by rdfs:subPropertyOf :EventRelation .\n' +
  ':discovered_at rdfs:subPropertyOf :EventRelation .\n' +

  // -- Provisional mappings to existing vocabularies --
  // Note: these are approximate; structural differences between this vocabulary
  // and the target schemas (especially CIDOC-CRM event-centric modeling) mean
  // some mappings involve semantic simplification.

  // Bibliographic relations
  '\n# -- Provisional mappings: Bibliographic Relations --\n' +
  ':mentions rdfs:subPropertyOf schema:mentions .\n' +
  ':reports rdfs:subPropertyOf crm:P70_documents .\n' +
  ':catalogues rdfs:subPropertyOf crm:P70_documents .\n' +
  ':transcribes rdfs:subPropertyOf bibo:transcriptOf .\n' +
  ':translates rdfs:subPropertyOf crm:P73_has_translation .\n' +
  ':contextualizes rdfs:subPropertyOf dcterms:relation .\n' +
  ':relevant_to_period rdfs:subPropertyOf crm:P4_has_time-span .\n' +
  ':relevant_to_region rdfs:subPropertyOf crm:P7_took_place_at .\n' +

  // Authority relations
  '\n# -- Provisional mappings: Authority Relations --\n' +
  ':DepictionRelation rdfs:subPropertyOf crm:P62_depicts .\n' +
  ':depicts_object rdfs:subPropertyOf crm:P62_depicts .\n' +
  ':depicts_person rdfs:subPropertyOf crm:P62_depicts .\n' +
  ':depicts_place rdfs:subPropertyOf crm:P62_depicts .\n' +
  ':depicts_event rdfs:subPropertyOf crm:P62_depicts .\n' +
  ':mentions_person rdfs:subPropertyOf schema:mentions .\n' +
  ':mentions_place rdfs:subPropertyOf schema:mentions .\n' +
  ':mentions_event rdfs:subPropertyOf schema:mentions .\n' +
  ':associated_with_period rdfs:subPropertyOf crm:P4_has_time-span .\n' +
  ':associated_with_region rdfs:subPropertyOf crm:P7_took_place_at .\n' +
  ':classified_as rdfs:subPropertyOf crm:P2_has_type .\n' +
  ':has_type rdfs:subPropertyOf crm:P2_has_type .\n' +
  ':written_in_language rdfs:subPropertyOf crm:P72_has_language .\n' +
  ':created_by rdfs:subPropertyOf dc:creator .\n' +
  ':discovered_at rdfs:subPropertyOf crm:P7_took_place_at .\n';

export function buildVocabularyTurtle(): string {
  return PREFIXES + VOCAB_DEFINITIONS;
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

  let ttl = PREFIXES;

  if (objectMetadata) {
    ttl += `\n<${manifestId}> a :Manifest ;\n`;
    const manifestProps: string[] = [];

    (objectMetadata.wikidata ?? []).forEach((item) => {
      const props = buildAuthorityConnections(item, `<${item.uri}>`);
      props.forEach((p) => manifestProps.push(p));
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

    // Object media（メディアが主語）
    (objectMetadata.media ?? []).forEach((item: MediaItem) => {
      const role = item.roleType ?? ':ObjectMedia';
      const refLevel = item.referenceLevel ?? ':DirectReference';
      ttl += `\n<${mediaBase}/object-${item.id}> a ${mediaClass(item.type)}, ${role} ;\n`;
      ttl += `  :referenceLevel ${refLevel} ;\n`;
      ttl += `  crm:P67_refers_to <${manifestId}> ;\n`;
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
      ttl += `\n<${bibBase}/object-${item.id}> a crm:E31_Document, ${roleType} ;\n`;
      const bibProps = buildBibProps(item);
      const connTriples = buildBibConnections(item, `<${manifestId}>`);
      if (bibProps || connTriples) {
        if (connTriples) ttl += connTriples;
        if (bibProps) ttl += bibProps;
      } else {
        ttl += `  crm:P67_refers_to <${manifestId}> .\n`;
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
        buildAuthorityConnections(item, `<${item.uri}>`).forEach((p) => ps.push(p));
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
        ttl += `\n<${mediaBase}/${item.id}> a ${mediaClass(item.type)}, ${role} ;\n`;
        ttl += `  :referenceLevel ${refLevel} ;\n`;
        ttl += `  crm:P67_refers_to <${annoBase}/${ann.id}> ;\n`;
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

      // Annotation bibliography（文書が主語）
      (ann.bibliography as BibliographyItem[] ?? []).forEach((item) => {
        const roleType = item.roleType ?? ':PrimarySource';
        ttl += `\n<${bibBase}/${item.id}> a crm:E31_Document, ${roleType} ;\n`;
        const bibProps = buildBibProps(item);
        const connTriples = buildBibConnections(item, `<${annoBase}/${ann.id}>`);
        if (bibProps || connTriples) {
          if (connTriples) ttl += connTriples;
          if (bibProps) ttl += bibProps;
        } else {
          ttl += `  crm:P67_refers_to <${annoBase}/${ann.id}> .\n`;
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

// relationTypes を接続プロパティとして出力（後方互換: 未設定時は crm:P67_refers_to）
function buildBibConnections(item: BibliographyItem, target: string): string {
  const types = item.relationTypes;
  if (!types || types.length === 0) {
    return `  crm:P67_refers_to ${target} ;\n`;
  }
  return types.map((t) => `  ${t} ${target} ;\n`).join('');
}

// authority relationTypes を接続プロパティの文字列配列として返す（後方互換: 未設定時は crm:P67_refers_to）
function buildAuthorityConnections(item: WikidataItem, target: string): string[] {
  const types = item.relationTypes;
  if (!types || types.length === 0) {
    return [`  crm:P67_refers_to ${target}`];
  }
  return types.map((t) => `  ${t} ${target}`);
}

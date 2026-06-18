import type { BibliographyItem, MediaItem, WikidataItem, ObjectMetadata, NewAnnotation, Project } from '@/types/main';
import { renderMarkdown, extractResourceRefs } from './markdown';

const PREFIXES =
  '@prefix : <https://www.example.com/vocabulary/> .\n' +
  '@prefix schema: <https://schema.org/> .\n' +
  '@prefix dc: <http://purl.org/dc/elements/1.1/> .\n' +
  '@prefix geo: <http://www.w3.org/2003/01/geo/wgs84_pos#> .\n' +
  '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n' +
  '@prefix owl: <http://www.w3.org/2002/07/owl#> .\n' +
  '@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n' +
  '@prefix crm: <http://www.cidoc-crm.org/cidoc-crm/> .\n' +
  '@prefix crmdig: <http://www.ics.forth.gr/isl/CRMdig/> .\n' +
  '@prefix oa: <http://www.w3.org/ns/oa#> .\n' +
  '@prefix prov: <http://www.w3.org/ns/prov#> .\n' +
  '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n' +
  '@prefix bibo: <http://purl.org/ontology/bibo/> .\n' +
  '@prefix dcterms: <http://purl.org/dc/terms/> .\n' +
  '@prefix cito: <http://purl.org/spar/cito/> .\n' +
  '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n';

const VOCAB_DEFINITIONS =
  '\n# ============================================================\n' +
  '# Cultural Heritage Annotation Ontology (CHAO) v0.1\n' +
  '# ============================================================\n' +
  '#\n' +
  '# CRMdig Correspondence (informative):\n' +
  '#   oa:Annotation        ≈  crmdig:D29_Annotation_Object\n' +
  '#   oa:SpecificResource  ≈  crmdig:D35_Area\n' +
  '#   oa:Annotation (act)  ≈  crmdig:D30_Annotation_Event\n' +
  '#     (D30 is not output separately; creator/time are recorded\n' +
  '#      via prov:wasAttributedTo and prov:generatedAtTime)\n' +
  '#   :DigitalObject       ≈  crmdig:D1_Digital_Object\n' +
  '#   :BibliographicResource  ≈  crm:E73_Information_Object\n' +
  '#   :Person              ≈  crm:E21_Person\n' +
  '#   :Place               ≈  crm:E53_Place\n' +
  '#   :Event               ≈  crm:E5_Event\n' +
  '# ============================================================\n' +

  // ----------------------------------------------------------
  // 1. Annotation Target
  // ----------------------------------------------------------
  '\n# -- 1. Annotation Target --\n' +
  ':AnnotationTarget a rdfs:Class .\n' +
  ':DigitalObject a rdfs:Class ;\n  rdfs:subClassOf :AnnotationTarget .\n' +
  ':Image rdfs:subClassOf :DigitalObject .\n' +
  ':ImageFile rdfs:subClassOf :Image .\n' +
  ':IIIFImage rdfs:subClassOf :Image .\n' +
  ':Video rdfs:subClassOf :DigitalObject .\n' +
  ':YouTube rdfs:subClassOf :Video .\n' +
  ':ThreeDModel rdfs:subClassOf :DigitalObject .\n' +
  ':IIIFResource rdfs:subClassOf :DigitalObject .\n' +
  ':TargetRegion a rdfs:Class ;\n  rdfs:subClassOf :AnnotationTarget .\n' +
  ':ImageRegion rdfs:subClassOf :TargetRegion .\n' +
  ':TemporalSegment rdfs:subClassOf :TargetRegion .\n' +
  ':ModelRegion rdfs:subClassOf :TargetRegion .\n' +

  // ----------------------------------------------------------
  // 2. Linked Resource
  // ----------------------------------------------------------
  '\n# -- 2. Linked Resource --\n' +
  ':LinkedResource a rdfs:Class .\n' +

  // 2.1 Bibliographic Resource
  '\n# -- 2.1 Bibliographic Resource --\n' +
  ':BibliographicResource a rdfs:Class ;\n  rdfs:subClassOf :LinkedResource ;\n  owl:equivalentClass crm:E73_Information_Object .\n' +
  ':PrimarySource rdfs:subClassOf :BibliographicResource .\n' +
  ':SecondarySource rdfs:subClassOf :BibliographicResource .\n' +
  ':Report rdfs:subClassOf :BibliographicResource .\n' +

  // 2.2 Authority Resource
  '\n# -- 2.2 Authority Resource --\n' +
  ':AuthorityResource a rdfs:Class ;\n  rdfs:subClassOf :LinkedResource .\n' +
  ':Person rdfs:subClassOf :AuthorityResource ;\n  owl:equivalentClass crm:E21_Person .\n' +
  ':Place rdfs:subClassOf :AuthorityResource ;\n  owl:equivalentClass crm:E53_Place .\n' +
  ':Event rdfs:subClassOf :AuthorityResource ;\n  owl:equivalentClass crm:E5_Event .\n' +
  ':Object rdfs:subClassOf :AuthorityResource .\n' +
  ':Period rdfs:subClassOf :AuthorityResource .\n' +
  ':Region rdfs:subClassOf :AuthorityResource .\n' +
  ':Culture rdfs:subClassOf :AuthorityResource .\n' +
  ':Language rdfs:subClassOf :AuthorityResource .\n' +
  ':Script rdfs:subClassOf :AuthorityResource .\n' +
  ':Concept rdfs:subClassOf :AuthorityResource .\n' +
  // 典拠データソース種別
  ':AuthorityData a crm:E55_Type .\n' +
  ':WikidataAuthority a crm:E55_Type ;\n  rdfs:subClassOf :AuthorityData .\n' +
  ':GeonamesAuthority a crm:E55_Type ;\n  rdfs:subClassOf :AuthorityData .\n' +

  // 2.3 Media Resource
  '\n# -- 2.3 Media Resource --\n' +
  ':MediaResource a rdfs:Class ;\n  rdfs:subClassOf :LinkedResource .\n' +
  ':MediaImage rdfs:subClassOf :MediaResource .\n' +
  ':MediaImageFile rdfs:subClassOf :MediaImage .\n' +
  ':MediaIIIFImage rdfs:subClassOf :MediaImage .\n' +
  ':MediaVideo rdfs:subClassOf :MediaResource .\n' +
  ':MediaYouTube rdfs:subClassOf :MediaVideo .\n' +
  ':MediaThreeDModel rdfs:subClassOf :MediaResource .\n' +

  // ----------------------------------------------------------
  // 3. Relation Hierarchy
  // ----------------------------------------------------------
  '\n# -- 3. Relation Hierarchy (top level) --\n' +
  ':Relation a rdf:Property .\n' +
  ':DirectRelation rdfs:subPropertyOf :Relation .\n' +
  ':ConceptualRelation rdfs:subPropertyOf :Relation .\n' +

  // 3.1 Direct Relation — Generic
  '\n# -- 3.1 Generic Direct Relation --\n' +
  ':GenericDirectRelation rdfs:subPropertyOf :DirectRelation .\n' +
  ':mentions rdfs:subPropertyOf :GenericDirectRelation .\n' +
  ':depicts rdfs:subPropertyOf :GenericDirectRelation .\n' +
  ':illustrates rdfs:subPropertyOf :GenericDirectRelation .\n' +

  // 3.2 Direct Relation — Bibliographic
  '\n# -- 3.2 Bibliographic Direct Relation --\n' +
  ':BibliographicDirectRelation rdfs:subPropertyOf :DirectRelation .\n' +
  ':describes rdfs:subPropertyOf :BibliographicDirectRelation .\n' +
  ':reports rdfs:subPropertyOf :BibliographicDirectRelation .\n' +
  ':analyzes rdfs:subPropertyOf :BibliographicDirectRelation .\n' +
  ':catalogues rdfs:subPropertyOf :BibliographicDirectRelation .\n' +
  ':transcribes rdfs:subPropertyOf :BibliographicDirectRelation .\n' +
  ':translates rdfs:subPropertyOf :BibliographicDirectRelation .\n' +

  // 3.3 Direct Relation — Authority
  '\n# -- 3.3 Authority Direct Relation --\n' +
  ':AuthorityDirectRelation rdfs:subPropertyOf :DirectRelation .\n' +
  ':identifies rdfs:subPropertyOf :AuthorityDirectRelation .\n' +
  ':depicts_object rdfs:subPropertyOf :AuthorityDirectRelation .\n' +
  ':depicts_person rdfs:subPropertyOf :AuthorityDirectRelation .\n' +
  ':depicts_place rdfs:subPropertyOf :AuthorityDirectRelation .\n' +
  ':depicts_event rdfs:subPropertyOf :AuthorityDirectRelation .\n' +
  ':mentions_person rdfs:subPropertyOf :AuthorityDirectRelation .\n' +
  ':mentions_place rdfs:subPropertyOf :AuthorityDirectRelation .\n' +
  ':mentions_event rdfs:subPropertyOf :AuthorityDirectRelation .\n' +

  // 3.4 Direct Relation — Media
  '\n# -- 3.4 Media Direct Relation --\n' +
  ':MediaDirectRelation rdfs:subPropertyOf :DirectRelation .\n' +
  ':documents rdfs:subPropertyOf :MediaDirectRelation .\n' +
  ':reproduces rdfs:subPropertyOf :MediaDirectRelation .\n' +

  // 3.5 Conceptual Relation — Generic
  '\n# -- 3.5 Generic Conceptual Relation --\n' +
  ':GenericConceptualRelation rdfs:subPropertyOf :ConceptualRelation .\n' +
  ':contextualizes rdfs:subPropertyOf :GenericConceptualRelation .\n' +
  ':compares_with rdfs:subPropertyOf :GenericConceptualRelation .\n' +
  ':related_to_concept rdfs:subPropertyOf :GenericConceptualRelation .\n' +

  // 3.6 Conceptual Relation — Bibliographic
  '\n# -- 3.6 Bibliographic Conceptual Relation --\n' +
  ':BibliographicConceptualRelation rdfs:subPropertyOf :ConceptualRelation .\n' +
  ':discusses_related_concept rdfs:subPropertyOf :BibliographicConceptualRelation .\n' +
  ':provides_typology rdfs:subPropertyOf :BibliographicConceptualRelation .\n' +

  // 3.7 Conceptual Relation — Authority
  '\n# -- 3.7 Authority Conceptual Relation --\n' +
  ':AuthorityConceptualRelation rdfs:subPropertyOf :ConceptualRelation .\n' +
  ':associated_with rdfs:subPropertyOf :AuthorityConceptualRelation .\n' +
  ':associated_with_period rdfs:subPropertyOf :associated_with .\n' +
  ':associated_with_region rdfs:subPropertyOf :associated_with .\n' +
  ':associated_with_person rdfs:subPropertyOf :associated_with .\n' +
  ':associated_with_culture rdfs:subPropertyOf :associated_with .\n' +
  ':classified_as rdfs:subPropertyOf :AuthorityConceptualRelation .\n' +
  ':has_type rdfs:subPropertyOf :AuthorityConceptualRelation .\n' +
  ':written_in_language rdfs:subPropertyOf :AuthorityConceptualRelation .\n' +
  ':uses_script rdfs:subPropertyOf :AuthorityConceptualRelation .\n' +
  ':created_by rdfs:subPropertyOf :AuthorityConceptualRelation .\n' +
  ':discovered_by rdfs:subPropertyOf :AuthorityConceptualRelation .\n' +
  ':discovered_at rdfs:subPropertyOf :AuthorityConceptualRelation .\n' +

  // ----------------------------------------------------------
  // 4. Domain / Range declarations (Relation Vocabulary Catalogue §6)
  // ----------------------------------------------------------
  // 向きの方針:
  //   書誌プロパティ  : BibliographicResource → AnnotationTarget
  //   典拠プロパティ  : AnnotationTarget → AuthorityResource
  //   メディアプロパティ: MediaResource → AnnotationTarget
  //   Generic        : LinkedResource → AnnotationTarget（複数リソース種別に適用）
  '\n# -- 4. Domain / Range --\n' +

  // Generic Direct (mentions: Bib○ Auth○ Media△ / depicts: Auth○ Media○ / illustrates: Bib○ Media○)
  ':mentions rdfs:domain :LinkedResource ;\n  rdfs:range :AnnotationTarget .\n' +
  ':depicts rdfs:domain :LinkedResource ;\n  rdfs:range :AnnotationTarget .\n' +
  ':illustrates rdfs:domain :LinkedResource ;\n  rdfs:range :AnnotationTarget .\n' +

  // Bibliographic Direct (書誌 → 対象)
  ':describes rdfs:domain :BibliographicResource ;\n  rdfs:range :AnnotationTarget .\n' +
  ':reports rdfs:domain :BibliographicResource ;\n  rdfs:range :AnnotationTarget .\n' +
  ':analyzes rdfs:domain :BibliographicResource ;\n  rdfs:range :AnnotationTarget .\n' +
  ':catalogues rdfs:domain :BibliographicResource ;\n  rdfs:range :AnnotationTarget .\n' +
  ':transcribes rdfs:domain :BibliographicResource ;\n  rdfs:range :AnnotationTarget .\n' +
  ':translates rdfs:domain :BibliographicResource ;\n  rdfs:range :AnnotationTarget .\n' +

  // Authority Direct (対象 → 典拠)
  ':identifies rdfs:domain :AnnotationTarget ;\n  rdfs:range :AuthorityResource .\n' +
  ':depicts_object rdfs:domain :AnnotationTarget ;\n  rdfs:range :Object .\n' +
  ':depicts_person rdfs:domain :AnnotationTarget ;\n  rdfs:range :Person .\n' +
  ':depicts_place rdfs:domain :AnnotationTarget ;\n  rdfs:range :Place .\n' +
  ':depicts_event rdfs:domain :AnnotationTarget ;\n  rdfs:range :Event .\n' +
  ':mentions_person rdfs:domain :AnnotationTarget ;\n  rdfs:range :Person .\n' +
  ':mentions_place rdfs:domain :AnnotationTarget ;\n  rdfs:range :Place .\n' +
  ':mentions_event rdfs:domain :AnnotationTarget ;\n  rdfs:range :Event .\n' +

  // Media Direct (メディア → 対象)
  ':documents rdfs:domain :MediaResource ;\n  rdfs:range :AnnotationTarget .\n' +
  ':reproduces rdfs:domain :MediaResource ;\n  rdfs:range :AnnotationTarget .\n' +

  // Generic Conceptual (Bib○ Auth△ Media○ → LinkedResource として汎用)
  ':contextualizes rdfs:domain :LinkedResource ;\n  rdfs:range :AnnotationTarget .\n' +
  ':compares_with rdfs:domain :LinkedResource ;\n  rdfs:range :AuthorityResource .\n' +
  ':related_to_concept rdfs:domain :LinkedResource ;\n  rdfs:range :AuthorityResource .\n' +

  // Bibliographic Conceptual (書誌 → 対象)
  ':discusses_related_concept rdfs:domain :BibliographicResource ;\n  rdfs:range :AnnotationTarget .\n' +
  ':provides_typology rdfs:domain :BibliographicResource ;\n  rdfs:range :AnnotationTarget .\n' +

  // Authority Conceptual (対象 → 典拠)
  ':associated_with rdfs:domain :AnnotationTarget ;\n  rdfs:range :AuthorityResource .\n' +
  ':associated_with_period rdfs:domain :AnnotationTarget ;\n  rdfs:range :Period .\n' +
  ':associated_with_region rdfs:domain :AnnotationTarget ;\n  rdfs:range :Region .\n' +
  ':associated_with_person rdfs:domain :AnnotationTarget ;\n  rdfs:range :Person .\n' +
  ':associated_with_culture rdfs:domain :AnnotationTarget ;\n  rdfs:range :Culture .\n' +
  ':classified_as rdfs:domain :AnnotationTarget ;\n  rdfs:range :Concept .\n' +
  ':has_type rdfs:domain :AnnotationTarget ;\n  rdfs:range :Concept .\n' +
  ':written_in_language rdfs:domain :AnnotationTarget ;\n  rdfs:range :Language .\n' +
  ':uses_script rdfs:domain :AnnotationTarget ;\n  rdfs:range :Script .\n' +
  ':created_by rdfs:domain :AnnotationTarget ;\n  rdfs:range :Person .\n' +
  ':discovered_by rdfs:domain :AnnotationTarget ;\n  rdfs:range :Person .\n' +
  ':discovered_at rdfs:domain :AnnotationTarget ;\n  rdfs:range :Place .\n' +

  // ----------------------------------------------------------
  // 5. Provisional mappings to existing vocabularies
  // ----------------------------------------------------------
  '\n# -- 4. Provisional mappings (approximate; structural differences apply) --\n' +
  // Generic Direct
  ':mentions rdfs:subPropertyOf schema:mentions .\n' +
  ':depicts rdfs:subPropertyOf crm:P62_depicts .\n' +
  ':depicts_object rdfs:subPropertyOf crm:P62_depicts .\n' +
  ':depicts_person rdfs:subPropertyOf crm:P62_depicts .\n' +
  ':depicts_place rdfs:subPropertyOf crm:P62_depicts .\n' +
  ':depicts_event rdfs:subPropertyOf crm:P62_depicts .\n' +
  ':mentions_person rdfs:subPropertyOf schema:mentions .\n' +
  ':mentions_place rdfs:subPropertyOf schema:mentions .\n' +
  ':mentions_event rdfs:subPropertyOf schema:mentions .\n' +
  // Authority Direct
  ':identifies rdfs:subPropertyOf owl:sameAs .\n' +
  // Bibliographic Direct
  ':reports rdfs:subPropertyOf crm:P70_documents .\n' +
  ':catalogues rdfs:subPropertyOf crm:P70_documents .\n' +
  ':transcribes rdfs:subPropertyOf bibo:transcriptOf .\n' +
  ':translates rdfs:subPropertyOf crm:P73_has_translation .\n' +
  // Generic Conceptual
  ':contextualizes rdfs:subPropertyOf dcterms:relation .\n' +
  // Authority Conceptual
  ':associated_with_period rdfs:subPropertyOf crm:P4_has_time-span .\n' +
  ':associated_with_region rdfs:subPropertyOf crm:P7_took_place_at .\n' +
  ':classified_as rdfs:subPropertyOf crm:P2_has_type .\n' +
  ':has_type rdfs:subPropertyOf crm:P2_has_type .\n' +
  ':written_in_language rdfs:subPropertyOf crm:P72_has_language .\n' +
  ':created_by rdfs:subPropertyOf dc:creator .\n' +
  ':discovered_at rdfs:subPropertyOf crm:P7_took_place_at .\n' +

  // -- Annotation inter-relations (Scholarly Discourse) --
  '\n# -- Annotation inter-relations --\n' +
  ':AnnotationRelation a rdf:Property ;\n  rdfs:domain oa:Annotation ;\n  rdfs:range oa:Annotation ;\n  rdfs:subPropertyOf oa:motivatedBy .\n' +
  ':supports rdfs:subPropertyOf :AnnotationRelation .\n' +
  ':challenges rdfs:subPropertyOf :AnnotationRelation .\n' +
  ':supplements rdfs:subPropertyOf :AnnotationRelation .\n' +

  // -- Research Project --
  '\n# -- Research Project --\n' +
  ':ResearchProject a rdfs:Class ;\n  rdfs:subClassOf prov:Agent ;\n  rdfs:comment "A collaborative unit that owns and edits annotations." .\n' +
  ':fromProject a rdf:Property ;\n  rdfs:domain oa:Annotation ;\n  rdfs:range :ResearchProject ;\n  rdfs:subPropertyOf prov:wasAttributedTo ;\n  rdfs:comment "The research project under which the annotation was authored." .\n' +
  ':visibility a rdf:Property ;\n  rdfs:domain :ResearchProject ;\n  rdfs:range xsd:string .\n';

export function buildVocabularyTurtle(): string {
  return PREFIXES + VOCAB_DEFINITIONS;
}

export function buildTurtle(
  manifestId: string,
  annotations: NewAnnotation[],
  objectMetadata: ObjectMetadata | null,
  projects: Project[] = []
): string {
  const manifestBase = manifestId.split('/').slice(0, -1).join('/');
  const annoBase = `${manifestBase}/annotation`;
  const mediaBase = `${manifestBase}/media`;
  const bibBase = `${manifestBase}/bibliography`;

  let ttl = PREFIXES;

  // ----- Research Project リソース（メンバー一覧は除外、createdBy のみ参照） -----
  projects.forEach((p) => {
    ttl += `\n<urn:project:${p.id}> a :ResearchProject ;\n`;
    const ps: string[] = [];
    ps.push(`  rdfs:label "${escapeLiteral(p.name)}"`);
    ps.push(`  schema:name "${escapeLiteral(p.name)}"`);
    if (p.description) ps.push(`  schema:description "${escapeLiteral(p.description)}"`);
    ps.push(`  :visibility "${p.visibility}"`);
    if (p.createdAt) {
      ps.push(`  prov:generatedAtTime "${new Date(p.createdAt).toISOString()}"^^xsd:dateTime`);
      ps.push(`  dcterms:created "${new Date(p.createdAt).toISOString()}"^^xsd:dateTime`);
    }
    if (p.createdBy) ps.push(`  prov:wasAttributedTo <urn:uid:${p.createdBy}>`);
    ps.forEach((line, i) => { ttl += line + (i < ps.length - 1 ? ' ;\n' : ' .\n'); });
  });

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
      if (item.entityType) ps.push(`  a ${item.entityType}`);
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

    const eventBase = `${manifestBase}/event`;
    const objCreator = objectMetadata.lastUpdatedBy;
    const objCreatedAt = objectMetadata.updatedAt;

    // Object media（メディアが主語）
    (objectMetadata.media ?? []).forEach((item: MediaItem) => {
      const mediaUri = `${mediaBase}/object-${item.id}`;
      ttl += `\n<${mediaUri}> a ${mediaClass(item.type)} ;\n`;
      ttl += buildMediaConnections(item, `<${manifestId}>`);
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
      ttl += buildE13ForMedia(item, manifestId, mediaUri, objCreator, objCreatedAt, eventBase);
    });

    // Object bibliography（文書が主語）
    (objectMetadata.bibliography ?? []).forEach((item: BibliographyItem) => {
      const roleType = item.roleType ?? ':PrimarySource';
      const bibUri = `${bibBase}/object-${item.id}`;
      ttl += `\n<${bibUri}> a crm:E31_Document, ${roleType} ;\n`;
      const bibProps = buildBibProps(item);
      const connTriples = buildBibConnections(item, `<${manifestId}>`);
      if (bibProps || connTriples) {
        if (connTriples) ttl += connTriples;
        if (bibProps) ttl += bibProps;
      } else {
        ttl += `  crm:P67_refers_to <${manifestId}> .\n`;
      }
      ttl += buildE13ForBib(item, manifestId, bibUri, objCreator, objCreatedAt, eventBase);
    });
  }

  // Annotations
  annotations
    .filter((ann) => ann.target_manifest === manifestId)
    .forEach((ann) => {
      const markdown: string = typeof ann.data?.body?.value === 'string' ? ann.data.body.value : '';
      const html = renderMarkdown(markdown, {
        bibliography: ann.bibliography,
        wikidata: ann.wikidata,
        media: ann.media,
      }).replace(/"/g, '\\"').replace(/\r?\n/g, ' ');

      ttl += `\n<${annoBase}/${ann.id}> a oa:Annotation ;\n`;
      const ps: string[] = [];
      ps.push(`  rdfs:label "${ann.data?.body?.label ?? ''}"`);
      ps.push(`  schema:description "${html}"`);

      // 本文中の Linked Resource 参照を CiTO で表現
      const refs = extractResourceRefs(markdown);
      const annBibIds = new Set((ann.bibliography ?? []).map((b) => b.id));
      const annAuthIds = new Set((ann.wikidata ?? []).map((w) => (w as unknown as { id?: string }).id).filter((v): v is string => !!v));
      const annAuthUris = new Set((ann.wikidata ?? []).map((w) => w.uri));
      refs.bibIds
        .filter((id) => annBibIds.has(id))
        .forEach((id) => ps.push(`  cito:cites <${bibBase}/${id}>`));
      refs.authIds
        .filter((id) => annAuthIds.has(id) || annAuthUris.has(id))
        .forEach((id) => {
          // id が URI そのままなら直接使用、そうでなければ wikidata 配列から uri を引く
          const w = (ann.wikidata ?? []).find((x) =>
            (x as unknown as { id?: string }).id === id || x.uri === id
          );
          const target = w?.uri || id;
          ps.push(`  cito:discusses <${target}>`);
        });

      // regionId があれば oa:SpecificResource を経由、なければ従来通り直接参照
      const regionId = (ann as unknown as Record<string, unknown>).regionId as string | undefined;
      if (regionId) {
        ps.push(`  oa:hasTarget <${annoBase}/region/${regionId}>`);
      } else {
        const target = ann.target_canvas ? `<${ann.target_canvas}>` : `<${ann.target_manifest}>`;
        ps.push(`  oa:hasTarget ${target}`);
      }
      if (ann.creator) ps.push(`  prov:wasAttributedTo <urn:uid:${ann.creator}>`);
      if (ann.createdAt) {
        const iso = new Date(ann.createdAt).toISOString();
        ps.push(`  prov:generatedAtTime "${iso}"^^xsd:dateTime`);
      }
      // どの研究プロジェクト発の言明か（移行過渡期データには欠落あり）
      if (ann.researchProjectId) {
        ps.push(`  :fromProject <urn:project:${ann.researchProjectId}>`);
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

      // oa:SpecificResource（領域ノード）の出力
      if (regionId) {
        const regionUri = `${annoBase}/region/${regionId}`;
        const source = ann.target_canvas ? `<${ann.target_canvas}>` : `<${ann.target_manifest}>`;
        const sel = (ann as unknown as Record<string, unknown>).data as { target?: { selector?: Record<string, unknown> } } | undefined;
        const selector = sel?.target?.selector;
        ttl += `\n<${regionUri}> a oa:SpecificResource ;\n`;
        ttl += `  oa:hasSource ${source} ;\n`;
        if (selector) {
          const selectorUri = `${regionUri}/selector`;
          ttl += `  oa:hasSelector <${selectorUri}> .\n`;
          ttl += `\n<${selectorUri}> a oa:FragmentSelector ;\n`;
          ttl += `  rdf:value "${JSON.stringify(selector).replace(/"/g, '\\"')}" .\n`;
        } else {
          ttl += `  oa:hasSource ${source} .\n`;
        }
      }

      const annEventBase = `${annoBase}/${ann.id}/event`;

      // Annotation media（メディアが主語）
      (ann.media as MediaItem[] ?? []).forEach((item) => {
        const mediaUri = `${mediaBase}/${item.id}`;
        ttl += `\n<${mediaUri}> a ${mediaClass(item.type)} ;\n`;
        ttl += buildMediaConnections(item, `<${annoBase}/${ann.id}>`);
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
        ttl += buildE13ForMedia(item, `${annoBase}/${ann.id}`, mediaUri, ann.creator, ann.createdAt, annEventBase);
      });

      // Annotation Wikidata entity descriptions
      (ann.wikidata as WikidataItem[] ?? []).forEach((item) => {
        const authorityType = item.type === 'geonames' ? ':GeonamesAuthority' : ':WikidataAuthority';
        const ps: string[] = [];
        ps.push(`  crm:P2_has_type ${authorityType}`);
        if (item.entityType) ps.push(`  a ${item.entityType}`);
        ps.push(`  rdfs:label "${item.label}"`);
        if (item.lat && item.lng) {
          ps.push(`  geo:lat "${item.lat}"`);
          ps.push(`  geo:long "${item.lng}"`);
        }
        if (item.thumbnail) ps.push(`  foaf:depiction <${item.thumbnail}>`);
        if (item.wikipedia) ps.push(`  rdfs:seeAlso <${item.wikipedia}>`);
        ttl += `\n<${item.uri}>\n`;
        ps.forEach((p, i) => { ttl += p + (i < ps.length - 1 ? ' ;\n' : ' .\n'); });
        ttl += buildE13ForAuthority(item, `${annoBase}/${ann.id}`, ann.creator, ann.createdAt, annEventBase);
      });

      // Annotation bibliography（文書が主語）
      (ann.bibliography as BibliographyItem[] ?? []).forEach((item) => {
        const roleType = item.roleType ?? ':PrimarySource';
        const bibUri = `${bibBase}/${item.id}`;
        ttl += `\n<${bibUri}> a crm:E31_Document, ${roleType} ;\n`;
        const bibProps = buildBibProps(item);
        const connTriples = buildBibConnections(item, `<${annoBase}/${ann.id}>`);
        if (bibProps || connTriples) {
          if (connTriples) ttl += connTriples;
          if (bibProps) ttl += bibProps;
        } else {
          ttl += `  crm:P67_refers_to <${annoBase}/${ann.id}> .\n`;
        }
        ttl += buildE13ForBib(item, `${annoBase}/${ann.id}`, bibUri, ann.creator, ann.createdAt, annEventBase);
      });

      // アノテーション間関係（:supports / :challenges / :supplements）
      const relatedAnnotations = (ann as unknown as Record<string, unknown>).relatedAnnotations as
        Array<{ annotationId: string; relation: string; comment?: string; createdBy?: string; createdAt?: number }> | undefined;
      (relatedAnnotations ?? []).forEach((rel) => {
        ttl += `\n<${annoBase}/${ann.id}> :${rel.relation} <${annoBase}/${rel.annotationId}>`;
        if (rel.comment || rel.createdBy || rel.createdAt) {
          // コメント・付与者・日時がある場合はリフィケーション or P3_has_note で補足
          ttl += ' .\n';
          if (rel.comment || rel.createdBy || rel.createdAt) {
            const stmtUri = `${annoBase}/${ann.id}/relation/${rel.annotationId}`;
            ttl += `\n<${stmtUri}> a rdf:Statement ;\n`;
            ttl += `  rdf:subject <${annoBase}/${ann.id}> ;\n`;
            ttl += `  rdf:predicate :${rel.relation} ;\n`;
            ttl += `  rdf:object <${annoBase}/${rel.annotationId}>`;
            if (rel.createdBy) ttl += ` ;\n  crm:P14_carried_out_by <urn:uid:${rel.createdBy}>`;
            if (rel.createdAt) ttl += ` ;\n  crm:P4_has_time-span "${new Date(rel.createdAt).toISOString()}"^^xsd:dateTime`;
            if (rel.comment) ttl += ` ;\n  crm:P3_has_note "${rel.comment.replace(/"/g, '\\"')}"`;
            ttl += ' .\n';
          }
        } else {
          ttl += ' .\n';
        }
      });
    });

  return ttl;
}

// Turtle リテラルの最低限のエスケープ（バックスラッシュ・ダブルクォート・改行）
function escapeLiteral(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
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

// media relationTypes を接続プロパティとして出力
// 後方互換: relationTypes 未設定時は crm:P67_refers_to で接続
function buildMediaConnections(item: MediaItem, target: string): string {
  const types = item.relationTypes;
  if (!types || types.length === 0) {
    // 後方互換: 旧データは crm:P67_refers_to で接続
    return `  crm:P67_refers_to ${target} ;\n`;
  }
  return types.map((t) => `  ${t} ${target} ;\n`).join('');
}

// ------------------------------------------------------------------
// E13 Attribute Assignment
// 書誌・典拠・メディアの各接続に対して crm:E13 ノードを生成する。
// 既存データでは addedBy/addedAt が書誌等に存在しないため、
// アノテーションの creator/createdAt を暫定的に適用する。
// ------------------------------------------------------------------

function buildE13ForBib(
  item: BibliographyItem,
  annotationUri: string,
  resourceUri: string,
  fallbackCreator: string | undefined,
  fallbackCreatedAt: number | undefined,
  eventBase: string
): string {
  const types = item.relationTypes;
  if (!types || types.length === 0) return '';
  // リソース自身の addedBy/addedAt を優先、なければアノテーションの値にフォールバック
  const by = item.addedBy ?? fallbackCreator;
  const at = item.addedAt ?? fallbackCreatedAt;
  return types.map((prop, i) => {
    const eventUri = `${eventBase}/bib-${item.id}-${i}`;
    let ttl = `\n<${eventUri}> a crm:E13_Attribute_Assignment ;\n`;
    ttl += `  crm:P140_assigned_attribute_to <${annotationUri}> ;\n`;
    ttl += `  crm:P141_assigned <${resourceUri}> ;\n`;
    ttl += `  crm:P177_assigned_property_of_type ${prop}`;
    if (by) ttl += ` ;\n  crm:P14_carried_out_by <urn:uid:${by}>`;
    if (at) ttl += ` ;\n  crm:P4_has_time-span "${new Date(at).toISOString()}"^^xsd:dateTime`;
    if (item.addedComment) ttl += ` ;\n  crm:P3_has_note "${item.addedComment.replace(/"/g, '\\"')}"`;
    ttl += ' .\n';
    return ttl;
  }).join('');
}

function buildE13ForAuthority(
  item: WikidataItem,
  annotationUri: string,
  fallbackCreator: string | undefined,
  fallbackCreatedAt: number | undefined,
  eventBase: string
): string {
  const types = item.relationTypes;
  if (!types || types.length === 0) return '';
  const by = item.addedBy ?? fallbackCreator;
  const at = item.addedAt ?? fallbackCreatedAt;
  return types.map((prop, i) => {
    const eventUri = `${eventBase}/auth-${encodeURIComponent(item.uri.split('/').pop() ?? item.uri)}-${i}`;
    let ttl = `\n<${eventUri}> a crm:E13_Attribute_Assignment ;\n`;
    ttl += `  crm:P140_assigned_attribute_to <${annotationUri}> ;\n`;
    ttl += `  crm:P141_assigned <${item.uri}> ;\n`;
    ttl += `  crm:P177_assigned_property_of_type ${prop}`;
    if (by) ttl += ` ;\n  crm:P14_carried_out_by <urn:uid:${by}>`;
    if (at) ttl += ` ;\n  crm:P4_has_time-span "${new Date(at).toISOString()}"^^xsd:dateTime`;
    if (item.addedComment) ttl += ` ;\n  crm:P3_has_note "${item.addedComment.replace(/"/g, '\\"')}"`;
    ttl += ' .\n';
    return ttl;
  }).join('');
}

function buildE13ForMedia(
  item: MediaItem,
  annotationUri: string,
  resourceUri: string,
  fallbackCreator: string | undefined,
  fallbackCreatedAt: number | undefined,
  eventBase: string
): string {
  const types = item.relationTypes;
  if (!types || types.length === 0) return '';
  const by = item.addedBy ?? fallbackCreator;
  const at = item.addedAt ?? fallbackCreatedAt;
  return types.map((prop, i) => {
    const eventUri = `${eventBase}/media-${item.id}-${i}`;
    let ttl = `\n<${eventUri}> a crm:E13_Attribute_Assignment ;\n`;
    ttl += `  crm:P140_assigned_attribute_to <${annotationUri}> ;\n`;
    ttl += `  crm:P141_assigned <${resourceUri}> ;\n`;
    ttl += `  crm:P177_assigned_property_of_type ${prop}`;
    if (by) ttl += ` ;\n  crm:P14_carried_out_by <urn:uid:${by}>`;
    if (at) ttl += ` ;\n  crm:P4_has_time-span "${new Date(at).toISOString()}"^^xsd:dateTime`;
    if (item.addedComment) ttl += ` ;\n  crm:P3_has_note "${item.addedComment.replace(/"/g, '\\"')}"`;
    ttl += ' .\n';
    return ttl;
  }).join('');
}

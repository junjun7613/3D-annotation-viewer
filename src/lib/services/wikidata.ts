import { WikidataItem } from '@/types/main';

/**
 * WikidataのURIからエンティティID（Q番号）を抽出する
 * @param wikidataUri - WikidataのURI (例: https://www.wikidata.org/wiki/Q12345)
 * @returns エンティティID (例: Q12345)
 */
export function extractWikidataId(wikidataUri: string): string {
  return wikidataUri.split('/').pop() || '';
}

/**
 * WikidataのエンティティIDからLinked Data用のURI（/entity/形式）を生成する
 * @param wikidataUri - WikidataのURI（どの形式でも可）
 * @returns Linked Data用URI (例: http://www.wikidata.org/entity/Q12345)
 */
export function toWikidataEntityUri(wikidataUri: string): string {
  const id = extractWikidataId(wikidataUri);
  return `http://www.wikidata.org/entity/${id}`;
}

interface WikidataQueryResult {
  label: string;
  wikipedia: string;
  lat: string;
  lng: string;
  thumbnail: string;
}

/**
 * WikidataのIDからSPARQLで情報を取得する
 * @param wikidataUri - WikidataのURI (例: https://www.wikidata.org/wiki/Q12345)
 * @param language - 言語コード (デフォルト: 'ja')
 * @returns WikidataQueryResult
 */
export async function fetchWikidataInfo(
  wikidataUri: string,
  language: string = 'ja'
): Promise<WikidataQueryResult> {
  const wikidataId = wikidataUri.split('/').pop();

  const query = `SELECT ?item ?itemLabel ?wikipediaUrl ?lat ?lng ?image WHERE {
    VALUES ?item {wd:${wikidataId}}
    SERVICE wikibase:label { bd:serviceParam wikibase:language "${language},en". }
    OPTIONAL {
      ?wikipediaUrl schema:about ?item ;
      schema:inLanguage "en" ;
      schema:isPartOf <https://en.wikipedia.org/> .
    }
    OPTIONAL {
      ?item wdt:P625 ?coord .
      BIND(geof:latitude(?coord) AS ?lat)
      BIND(geof:longitude(?coord) AS ?lng)
    }
    OPTIONAL {
      ?item wdt:P18 ?image .
    }
  }`;

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  const result = await fetch(url).then((res) => res.json());

  const binding = result['results']['bindings'][0];

  const label = binding?.['itemLabel']?.['value'] || '';
  const wikipedia = binding?.['wikipediaUrl']?.['value'] || '';
  const lat = binding?.['lat']?.['value'] || '';
  const lng = binding?.['lng']?.['value'] || '';

  // サムネイル画像のURL生成
  // WikidataのP18プロパティはWikimedia CommonsのファイルURLを返す
  // 例: http://commons.wikimedia.org/wiki/Special:FilePath/Example.jpg
  let thumbnail = '';
  if (binding?.['image']?.['value']) {
    const imageUrl = binding['image']['value'];
    // Wikimedia Commonsのサムネイル用にwidth=300pxで取得
    thumbnail = `${imageUrl}?width=300`;
  }

  return {
    label,
    wikipedia,
    lat,
    lng,
    thumbnail,
  };
}

/**
 * WikidataのURIからWikidataItemオブジェクトを生成する
 * @param wikidataUri - WikidataのURI
 * @param language - 言語コード
 * @returns WikidataItem
 */
export async function createWikidataItem(
  wikidataUri: string,
  language: string = 'ja'
): Promise<WikidataItem> {
  const info = await fetchWikidataInfo(wikidataUri, language);

  return {
    type: 'wikidata',
    uri: wikidataUri,
    label: info.label,
    wikipedia: info.wikipedia,
    lat: info.lat,
    lng: info.lng,
    thumbnail: info.thumbnail,
  };
}

/**
 * Markdown を HTML に変換するユーティリティ。
 *
 * 本文中の Linked Resource 参照（`#bib/<id>` / `#auth/<id>` / `#media/<id>`）は
 * カスタムレンダラで装飾する：
 *   - `#bib/<id>`   → ツールチップ付き引用ラベル（書誌情報を data-* に格納）
 *   - `#auth/<id>`  → ツールチップ付き典拠ラベル
 *   - `#media/<id>` → サムネイル埋め込み（画像構文 ![](#media/<id>) の場合）
 *
 * 紐づけられているリソース配列（書誌・典拠・メディア）を渡せばラベル・サムネイル等を解決する。
 */

import { Marked } from 'marked';
import type { BibliographyItem, WikidataItem, MediaItem } from '@/types/main';

const BIB_PREFIX = '#bib/';
const AUTH_PREFIX = '#auth/';
const MEDIA_PREFIX = '#media/';

export interface MarkdownContext {
  bibliography?: BibliographyItem[];
  wikidata?: WikidataItem[];
  media?: MediaItem[];
  /** manifest URL → サムネ URL のマップ（IIIF メディアサムネ解決用） */
  iiifThumbnails?: Record<string, string | null>;
}

interface ResourceRefs {
  bibIds: string[];
  authIds: string[];
  mediaIds: string[];
}

/**
 * YouTube URL から動画 ID を抽出。既に ID らしき文字列ならそのまま返す。
 * 対応形式: youtu.be/<id>, youtube.com/watch?v=<id>, youtube.com/embed/<id>
 */
function extractYouTubeId(input: string): string {
  if (!input) return '';
  // 既に 11 文字程度の ID なら返す
  if (/^[\w-]{6,15}$/.test(input)) return input;
  const m1 = input.match(/youtu\.be\/([\w-]{6,15})/);
  if (m1) return m1[1];
  const m2 = input.match(/[?&]v=([\w-]{6,15})/);
  if (m2) return m2[1];
  const m3 = input.match(/youtube\.com\/embed\/([\w-]{6,15})/);
  if (m3) return m3[1];
  // 既存 3D エディタの実装に合わせて、フォールバックで split('/')[3]
  const parts = input.split('/');
  return parts[3] || '';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Markdown → HTML 変換。リソース埋め込みリンクはカスタム描画。
 */
export function renderMarkdown(markdown: string, ctx: MarkdownContext = {}): string {
  if (!markdown) return '';

  const m = new Marked({ gfm: true, breaks: true });
  // marked v16: renderer.link / renderer.image はトークンを受け取りオブジェクト形式
  m.use({
    renderer: {
      link({ href, title, tokens }) {
        const text = (this as { parser: { parseInline: (t: unknown) => string } })
          .parser.parseInline(tokens);
        if (href.startsWith(BIB_PREFIX)) {
          const id = href.slice(BIB_PREFIX.length);
          const b = ctx.bibliography?.find((x) => x.id === id);
          const tip = b ? `${b.author || ''}${b.title ? ` "${b.title}"` : ''}${b.year ? ` (${b.year})` : ''}` : id;
          const externalUrl = b?.page;
          const badge = `<span class="md-ref md-ref-bib" data-ref-type="bib" data-ref-id="${escapeHtml(id)}" title="${escapeHtml(tip)}">${text}</span>`;
          if (externalUrl) {
            return `<a class="md-ref-link" href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer">${badge}</a>`;
          }
          return badge;
        }
        if (href.startsWith(AUTH_PREFIX)) {
          const id = href.slice(AUTH_PREFIX.length);
          const w = ctx.wikidata?.find((x) => x.uri === id || (x as unknown as { id?: string }).id === id);
          const tip = w ? `${w.label || ''}${w.uri ? ` <${w.uri}>` : ''}` : id;
          const externalUrl = w?.uri;
          const badge = `<span class="md-ref md-ref-auth" data-ref-type="auth" data-ref-id="${escapeHtml(id)}" title="${escapeHtml(tip)}">${text}</span>`;
          if (externalUrl) {
            return `<a class="md-ref-link" href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer">${badge}</a>`;
          }
          return badge;
        }
        if (href.startsWith(MEDIA_PREFIX)) {
          const id = href.slice(MEDIA_PREFIX.length);
          return `<span class="md-ref md-ref-media" data-ref-type="media" data-ref-id="${escapeHtml(id)}">${text}</span>`;
        }
        const t = title ? ` title="${escapeHtml(title)}"` : '';
        return `<a href="${escapeHtml(href)}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`;
      },
      image({ href, title, text }) {
        if (href.startsWith(MEDIA_PREFIX)) {
          const id = href.slice(MEDIA_PREFIX.length);
          const item = ctx.media?.find((x) => x.id === id);
          const cap = text || item?.caption || '';
          const t = title ? ` title="${escapeHtml(title)}"` : '';
          if (!item) {
            return `<span class="md-ref md-ref-media-missing" data-ref-id="${escapeHtml(id)}">[media: ${escapeHtml(id)}]</span>`;
          }
          // メディア種別ごとにサムネイル URL を解決
          let thumbSrc = '';
          let placeholder = ''; // サムネ画像が無い場合の代替アイコン HTML
          if (item.type === 'img') {
            thumbSrc = item.source || '';
          } else if (item.type === 'iiif') {
            // manifest から取得したサムネ URL を優先
            const resolved = item.manifestUrl ? ctx.iiifThumbnails?.[item.manifestUrl] : null;
            if (resolved) {
              thumbSrc = resolved;
            } else if (item.source) {
              // フォールバック：source が Image API service URL ならそのまま、それ以外は空
              thumbSrc = /\/(info\.json|full\/)/.test(item.source)
                ? `${item.source.replace(/\/?(info\.json)?$/, '')}/full/240,/0/default.jpg`
                : '';
            }
            // 解決できない場合はプレースホルダ
            if (!thumbSrc) {
              placeholder = `<div class="md-embed-placeholder md-embed-iiif">`
                + `<span class="md-embed-icon">IIIF</span>`
                + `<span class="md-embed-label">${escapeHtml(cap || 'IIIF image')}</span>`
                + `</div>`;
            }
          } else if (item.type === 'video') {
            // YouTube URL 形式から ID を抽出してサムネを組み立て
            const ytId = extractYouTubeId(item.source || '');
            thumbSrc = ytId ? `https://img.youtube.com/vi/${encodeURIComponent(ytId)}/mqdefault.jpg` : '';
          } else if (item.type === 'sketchfab') {
            // Sketchfab はサムネ URL を簡易取得できないためプレースホルダ
            placeholder = `<div class="md-embed-placeholder md-embed-sketchfab">`
              + `<span class="md-embed-icon">3D</span>`
              + `<span class="md-embed-label">${escapeHtml(cap || 'Sketchfab model')}</span>`
              + `</div>`;
          }
          // サムネ画像 or プレースホルダがあれば figure として描画
          if (thumbSrc) {
            return `<figure class="md-embed-media" data-ref-id="${escapeHtml(id)}" data-media-type="${escapeHtml(item.type)}">`
              + `<img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(cap)}"${t} />`
              + (cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : '')
              + `</figure>`;
          }
          if (placeholder) {
            return `<figure class="md-embed-media" data-ref-id="${escapeHtml(id)}" data-media-type="${escapeHtml(item.type)}">`
              + placeholder
              + (cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : '')
              + `</figure>`;
          }
          // 最終フォールバック
          return `<span class="md-ref md-ref-media" data-ref-type="media" data-ref-id="${escapeHtml(id)}" title="${escapeHtml(`${item.type}: ${item.source}`)}">${escapeHtml(cap || `[${item.type}]`)}</span>`;
        }
        const t = title ? ` title="${escapeHtml(title)}"` : '';
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${t} />`;
      },
    },
  });

  return m.parse(markdown, { async: false }) as string;
}

/**
 * Markdown 本文から書誌/典拠/メディアの参照 ID を抽出。
 * `[label](#bib/<id>)` / `[label](#auth/<id>)` / `![label](#media/<id>)` または `[label](#media/<id>)`
 */
export function extractResourceRefs(markdown: string): ResourceRefs {
  const bibIds = new Set<string>();
  const authIds = new Set<string>();
  const mediaIds = new Set<string>();
  if (!markdown) return { bibIds: [], authIds: [], mediaIds: [] };

  const re = /!?\[[^\]]*\]\((#(bib|auth|media)\/([^)\s]+))\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const kind = m[2];
    const id = m[3];
    if (kind === 'bib') bibIds.add(id);
    else if (kind === 'auth') authIds.add(id);
    else if (kind === 'media') mediaIds.add(id);
  }
  return { bibIds: [...bibIds], authIds: [...authIds], mediaIds: [...mediaIds] };
}

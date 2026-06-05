import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

# ==============================
# レイアウト定数
# ==============================
TOTAL_LEFT   = 0.4
TOTAL_RIGHT  = 19.6
TOTAL_W      = TOTAL_RIGHT - TOTAL_LEFT

PAD_OUTER    = 0.4
COL_HEADER_W = 2.8   # 左端のリソース種別ラベル列幅
COL_GAP      = 0.3   # 列間隙間
N_DATA_COLS  = 2     # Direct / Conceptual
DATA_COL_W   = (TOTAL_W - COL_HEADER_W - COL_GAP * (N_DATA_COLS)) / N_DATA_COLS

ROW_GAP      = 0.3   # 行間
HEADER_ROW_H = 0.85  # 最上部の列タイトル行の高さ

ITEM_H       = 0.44
ITEM_GAP     = 0.11
PAD_TOP      = 0.25
PAD_BOT      = 0.20
SUB_INDENT   = 1
SUB_FS       = 11.5
ITEM_FS      = 12.5
ITEM_W_RATIO = 0.93
RES_LABEL_FS = 13

# 色定義
COLORS = {
    'direct':     {'header_bg': '#2E75B6', 'header_text': 'white'},
    'conceptual': {'header_bg': '#375623', 'header_text': 'white'},
    'bib':   {'bg': '#D6E8F7', 'border': '#5B9BD5', 'label_bg': '#5B9BD5', 'item_bg': '#EAF3FB'},
    'auth':  {'bg': '#D9F0D9', 'border': '#5CA85C', 'label_bg': '#5CA85C', 'item_bg': '#EAF5EA'},
    'media': {'bg': '#FDE8CC', 'border': '#E8954A', 'label_bg': '#E8954A', 'item_bg': '#FEF3E6'},
}

# ==============================
# データ定義  (label, is_sub)
# ==============================
rows = [
    {
        'res': 'bib',
        'label_ja': '書誌資料',
        'label_en': 'Bibliographic\nResource',
        'direct': [
            ('mentions — 言及',            False),
            ('describes — 説明',           False),
            ('reports — 報告',             False),
            ('analyzes — 分析',            False),
            ('catalogues — 目録化',        False),
            ('illustrates — 図示',         False),
            ('transcribes — 翻刻',         False),
            ('translates — 翻訳',          False),
        ],
        'conceptual': [
            ('contextualizes — 文脈化',                   False),
            ('concept_contextualization — 概念的背景',    True),
            ('period_contextualization — 時代的背景',     True),
            ('region_contextualization — 地域的背景',     True),
            ('person_contextualization — 人物的背景',     True),
            ('compares_with — 比較',                      False),
            ('provides_typology — 類型学的基盤',          False),
        ],
    },
    {
        'res': 'auth',
        'label_ja': '典拠データ',
        'label_en': 'Authority\nResource',
        'direct': [
            ('identifies — 同定',    False),
            ('depicts — 描写',       False),
            ('mentions — 言及',      False),
        ],
        'conceptual': [
            ('associated_with — 関連付け',          False),
            ('classified_as — 分類',                False),
            ('has_type — 種別',                     False),
            ('written_in_language — 使用言語',      False),
            ('uses_script — 使用文字',              False),
            ('created_by — 制作者',                 False),
        ],
    },
    {
        'res': 'media',
        'label_ja': 'メディア資料',
        'label_en': 'Media\nResource',
        'direct': [
            ('depicts — 表象',           False),
            ('depicts_part — 部分表象',  False),
            ('documents — 記録',         False),
            ('measures — 計測',          False),
            ('reproduces — 複製',        False),
            ('illustrates — 図示',       False),
        ],
        'conceptual': [
            ('contextualizes — 文脈化',                   False),
            ('concept_contextualization — 概念的背景',    True),
            ('period_contextualization — 時代的背景',     True),
            ('region_contextualization — 地域的背景',     True),
            ('person_contextualization — 人物的背景',     True),
            ('compares_with — 比較',                      False),
            ('illustrates_typology — 類型学的図示',       False),
        ],
    },
]

# ==============================
# 行の高さを計算（Direct / Conceptual の多い方に合わせる）
# ==============================
def calc_row_h(row):
    n = max(len(row['direct']), len(row['conceptual']))
    return PAD_TOP + n * (ITEM_H + ITEM_GAP) + PAD_BOT

row_heights = [calc_row_h(r) for r in rows]
total_content_h = HEADER_ROW_H + sum(row_heights) + ROW_GAP * len(rows)
fig_h = total_content_h + PAD_OUTER * 2
fig_w = 20

fig, ax = plt.subplots(figsize=(fig_w, fig_h))
ax.set_xlim(0, fig_w)
ax.set_ylim(0, fig_h)
ax.axis('off')
fig.patch.set_facecolor('white')

# X座標
x_res    = TOTAL_LEFT
x_direct = TOTAL_LEFT + COL_HEADER_W + COL_GAP
x_conc   = x_direct + DATA_COL_W + COL_GAP

# Y座標（上から）
cur_y = fig_h - PAD_OUTER

# ==============================
# 列ヘッダー行
# ==============================
# リソース種別ラベル上部（空白）
# Direct Relation ヘッダー
ax.add_patch(FancyBboxPatch(
    (x_direct, cur_y - HEADER_ROW_H), DATA_COL_W, HEADER_ROW_H,
    boxstyle="round,pad=0.05", linewidth=0,
    edgecolor='none', facecolor=COLORS['direct']['header_bg']))
ax.text(x_direct + DATA_COL_W / 2, cur_y - HEADER_ROW_H / 2,
    'Direct Reference', ha='center', va='center',
    fontsize=15, fontweight='bold', color='white', fontfamily='Hiragino Sans')

# Conceptual Relation ヘッダー
ax.add_patch(FancyBboxPatch(
    (x_conc, cur_y - HEADER_ROW_H), DATA_COL_W, HEADER_ROW_H,
    boxstyle="round,pad=0.05", linewidth=0,
    edgecolor='none', facecolor=COLORS['conceptual']['header_bg']))
ax.text(x_conc + DATA_COL_W / 2, cur_y - HEADER_ROW_H / 2,
    'Contextual Scholarship', ha='center', va='center',
    fontsize=15, fontweight='bold', color='white', fontfamily='Hiragino Sans')

cur_y -= HEADER_ROW_H + ROW_GAP

# ==============================
# 各行を描画
# ==============================
def draw_items(ax, items, x, y_top, col_w):
    iw_full = col_w * ITEM_W_RATIO
    ix_base = x + col_w * (1 - ITEM_W_RATIO) / 2
    for i, (label, is_sub) in enumerate(items):
        indent = SUB_INDENT if is_sub else 0.0
        ix = ix_base + indent
        iw = iw_full - indent
        bt = y_top - PAD_TOP - i * (ITEM_H + ITEM_GAP)
        bb = bt - ITEM_H
        fc = '#F0F0F0' if is_sub else 'white'
        fs = SUB_FS if is_sub else ITEM_FS
        ax.add_patch(FancyBboxPatch(
            (ix, bb), iw, ITEM_H,
            boxstyle="round,pad=0.04", linewidth=0.7,
            edgecolor='#BBBBBB', facecolor=fc))
        ax.text(ix + iw / 2, (bt + bb) / 2,
            label.strip(), ha='center', va='center',
            fontsize=fs, fontfamily='Hiragino Sans', color='#333333')

for row, rh in zip(rows, row_heights):
    c = COLORS[row['res']]
    row_top = cur_y
    row_bot = cur_y - rh

    # リソース種別ラベル列
    ax.add_patch(FancyBboxPatch(
        (x_res, row_bot), COL_HEADER_W, rh,
        boxstyle="round,pad=0.05", linewidth=1.5,
        edgecolor=c['border'], facecolor=c['label_bg']))
    ax.text(x_res + COL_HEADER_W / 2, (row_top + row_bot) / 2 + 0.1,
        row['label_ja'], ha='center', va='center',
        fontsize=RES_LABEL_FS, fontweight='bold', color='white',
        fontfamily='Hiragino Sans')
    ax.text(x_res + COL_HEADER_W / 2, (row_top + row_bot) / 2 - 0.3,
        row['label_en'], ha='center', va='center',
        fontsize=10, color='white', fontfamily='Hiragino Sans',
        linespacing=1.3)

    # Direct 列
    ax.add_patch(FancyBboxPatch(
        (x_direct, row_bot), DATA_COL_W, rh,
        boxstyle="round,pad=0.05", linewidth=1.5,
        edgecolor=c['border'], facecolor=c['bg']))
    draw_items(ax, row['direct'], x_direct, row_top, DATA_COL_W)

    # Conceptual 列
    ax.add_patch(FancyBboxPatch(
        (x_conc, row_bot), DATA_COL_W, rh,
        boxstyle="round,pad=0.05", linewidth=1.5,
        edgecolor=c['border'], facecolor=c['bg']))
    draw_items(ax, row['conceptual'], x_conc, row_top, DATA_COL_W)

    cur_y = row_bot - ROW_GAP

plt.tight_layout(pad=0)
out_path = '/Users/junogawa/Dropbox/PC/Projects/three_sample/public/figures/relation-hierarchy.png'
plt.savefig(out_path, dpi=300, bbox_inches='tight', facecolor='white')
print('saved:', out_path)

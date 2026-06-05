import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

fig, ax = plt.subplots(figsize=(18, 12))
ax.set_xlim(0, 18)
ax.set_ylim(0, 12)
ax.axis('off')
fig.patch.set_facecolor('white')

# ==============================
# レイアウト定数
# ==============================
TOTAL_LEFT  = 0.4   # 全体左端
TOTAL_RIGHT = 17.6  # 全体右端
TOTAL_W     = TOTAL_RIGHT - TOTAL_LEFT  # 17.2

COL_TOP     = 11.7  # 各列ボックス上端
COL_BOT     = 2.6
COL_TITLE_H = 1.0   # 列見出し帯の高さ

GAP         = 0.25  # 列間の隙間
N_COLS      = 3
COL_W       = (TOTAL_W - GAP * (N_COLS - 1)) / N_COLS  # 各列幅を均等に

COL_XS = [TOTAL_LEFT + i * (COL_W + GAP) for i in range(N_COLS)]

ITEM_W_RATIO = 0.88   # 列幅に対するアイテムボックス幅の比率
ITEM_H       = 0.52
ITEM_GAP     = 0.18
PAD_TOP      = 0.35   # 見出し帯下端からアイテム上端までの余白
PAD_SIDE     = (1 - ITEM_W_RATIO) / 2  # 左右マージン比率
SUB_INDENT   = 1
NOTE_RESERVE = 0.55

columns = [
    {
        'title_ja': '書誌資料',
        'title_en': 'Bibliographic Resource',
        'color': '#D6E8F7', 'border': '#5B9BD5',
        'items': [
            ('Primary Source（一次史料）',   False),
            ('Secondary Source（二次研究資料）', False),
            ('Report（調査報告書等）',           False),
        ],
        'note': None,
    },
    {
        'title_ja': '典拠データ',
        'title_en': 'Authority Resource',
        'color': '#D9F0D9', 'border': '#5CA85C',
        'items': [
            ('Person（人物）',       False),
            ('Place（地名）',        False),
            ('Event（出来事）',      False),
            ('Object（遺物・作品）',  False),
            ('Period（時代）',       False),
            ('Region（地域）',       False),
            ('Culture（文化）',      False),
            ('Language（言語）',     False),
            ('Script（文字）',       False),
            ('Concept（概念）',      False),
        ],
        'note': """典拠データソース: Wikidata / GeoNames / 
        Getty TGN / VIAF / 独自典拠""",
    },
    {
        'title_ja': 'メディア資料',
        'title_en': 'Media Resource',
        'color': '#FDE8CC', 'border': '#E8954A',
        'items': [
            ('Image',      False),
            ('Image File', True),
            ('IIIF Image', True),
            ('Video',      False),
            ('YouTube',    True),
            ('3D Model',   False),
        ],
        'note': None,
    },
]

# ==============================
# 各列
# ==============================
for idx, col in enumerate(columns):
    x = COL_XS[idx]
    col_h = COL_TOP - COL_BOT

    # 列全体背景
    ax.add_patch(FancyBboxPatch(
        (x, COL_BOT), COL_W, col_h,
        boxstyle="round,pad=0.05", linewidth=1.5,
        edgecolor=col['border'], facecolor=col['color']))

    # 見出し帯
    ax.add_patch(FancyBboxPatch(
        (x, COL_TOP - COL_TITLE_H), COL_W, COL_TITLE_H,
        boxstyle="round,pad=0.05", linewidth=0,
        edgecolor=col['border'], facecolor=col['border']))
    ax.text(x + COL_W / 2, COL_TOP - COL_TITLE_H / 2 + 0.15,
        col['title_ja'], ha='center', va='center',
        fontsize=18, fontweight='bold', color='white',
        fontfamily='Hiragino Sans')
    ax.text(x + COL_W / 2, COL_TOP - COL_TITLE_H / 2 - 0.18,
        col['title_en'], ha='center', va='center',
        fontsize=12, color='white', fontfamily='Hiragino Sans')

    # アイテム開始Y（見出し帯下端 - PAD_TOP）
    item_top_y = COL_TOP - COL_TITLE_H - PAD_TOP

    item_w_full = COL_W * ITEM_W_RATIO
    item_x_base = x + COL_W * (1 - ITEM_W_RATIO) / 2

    for i, (label, is_sub) in enumerate(col['items']):
        indent = SUB_INDENT if is_sub else 0.0
        ix = item_x_base + indent
        iw = item_w_full - indent

        # ボックス上端から順に積み下げ
        box_top = item_top_y - i * (ITEM_H + ITEM_GAP)
        box_bot = box_top - ITEM_H

        fc = '#F5F5F5' if is_sub else 'white'
        fs = 12 if is_sub else 14

        ax.add_patch(FancyBboxPatch(
            (ix, box_bot), iw, ITEM_H,
            boxstyle="round,pad=0.05", linewidth=0.8,
            edgecolor='#AAAAAA', facecolor=fc))
        ax.text(ix + iw / 2, (box_top + box_bot) / 2, label,
            ha='center', va='center',
            fontsize=fs, fontfamily='Hiragino Sans', color='#333333')

    # ノート
    if col['note']:
        ax.text(x + COL_W / 2, COL_BOT + NOTE_RESERVE / 2,
            col['note'], ha='center', va='center',
            fontsize=12, color='#555555', fontfamily='Hiragino Sans')

plt.tight_layout(pad=0)
out_path = '/Users/junogawa/Dropbox/PC/Projects/three_sample/public/figures/linked-resource-classification.png'
plt.savefig(out_path, dpi=300, bbox_inches='tight', facecolor='white')
print('saved:', out_path)

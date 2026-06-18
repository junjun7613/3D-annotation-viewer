"""Generate a concept diagram of User / Project / Region / Annotation relationships as PNG."""
from __future__ import annotations

import matplotlib
import matplotlib.font_manager as fm
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

JP_FONT_CANDIDATES = [
    "Hiragino Sans", "Hiragino Maru Gothic Pro", "Hiragino Kaku Gothic Pro",
    "YuGothic", "Yu Gothic", "IPAexGothic",
    "Noto Sans CJK JP", "Noto Sans JP", "Arial Unicode MS",
]
available = {f.name for f in fm.fontManager.ttflist}
for cand in JP_FONT_CANDIDATES:
    if cand in available:
        matplotlib.rcParams["font.family"] = cand
        break
matplotlib.rcParams["axes.unicode_minus"] = False

# ──────────────────────────── Canvas ────────────────────────────
FIG_W, FIG_H = 20, 14
fig, ax = plt.subplots(figsize=(FIG_W, FIG_H), dpi=140)
ax.set_xlim(0, 200)
ax.set_ylim(0, 140)
ax.set_aspect("equal")
ax.axis("off")

# ──────────────────────────── Palette ────────────────────────────
C_USER = "#FFE9A8"; C_USER_EDGE = "#C49A2C"
C_PROJ = "#CDE4FF"; C_PROJ_EDGE = "#3478C6"
C_ANNOT = "#E7D6FF"; C_ANNOT_EDGE = "#7A4FB5"
C_REGION = "#C9F0D5"; C_REGION_EDGE = "#2F8C50"
C_OBJECT = "#FFD3C2"; C_OBJECT_EDGE = "#C95B30"
C_CREATOR = "#8A6610"


# ──────────────────────────── Helpers ────────────────────────────
def box(x, y, w, h, label, fc, ec, fontsize=11, fontweight="bold", radius=1.0):
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.3,rounding_size={radius}",
        linewidth=1.8, facecolor=fc, edgecolor=ec,
    ))
    ax.text(x + w / 2, y + h / 2, label,
            ha="center", va="center",
            fontsize=fontsize, fontweight=fontweight)


def two_row_box(x, y, w, h, top, bottom, fc, ec,
                top_fs=12, bottom_fs=9, bottom_color="#666", radius=1.0):
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.3,rounding_size={radius}",
        linewidth=1.8, facecolor=fc, edgecolor=ec,
    ))
    ax.text(x + w / 2, y + h * 0.72, top,
            ha="center", va="center", fontsize=top_fs, fontweight="bold")
    ax.plot([x + 1.2, x + w - 1.2], [y + h * 0.45, y + h * 0.45],
            color=ec, linewidth=0.8, alpha=0.4)
    ax.text(x + w / 2, y + h * 0.22, bottom,
            ha="center", va="center",
            fontsize=bottom_fs, color=bottom_color, fontstyle="italic")


def arrow(x1, y1, x2, y2, label=None, color="#444", style="-|>", lw=1.6,
          linestyle="solid", label_pos=0.5, label_xy=None, fontsize=10,
          rad=0.0):
    ax.add_patch(FancyArrowPatch(
        (x1, y1), (x2, y2),
        arrowstyle=style, mutation_scale=18,
        color=color, linewidth=lw, linestyle=linestyle,
        shrinkA=3, shrinkB=3,
        connectionstyle=f"arc3,rad={rad}",
    ))
    if label:
        if label_xy is not None:
            mx, my = label_xy
        else:
            mx = x1 + (x2 - x1) * label_pos
            my = y1 + (y2 - y1) * label_pos
        ax.text(mx, my, label, ha="center", va="center",
                fontsize=fontsize, color=color,
                bbox=dict(boxstyle="round,pad=0.25", fc="white",
                          ec="#dddddd", alpha=0.95))


# ──────────────────────────── Title ────────────────────────────
ax.text(100, 137, "User / Project / Region / Annotation — 概念図",
        ha="center", fontsize=17, fontweight="bold")
ax.text(100, 133.5,
        "Region は所有されず、プロジェクトを横断して共有される (Linked-Data リソース)",
        ha="center", fontsize=10.5, color="#555", fontstyle="italic")

# ──────────────────────────── Legend (top, horizontal) ────────────────────────────
legend_handles = [
    mpatches.Patch(facecolor=C_USER,   edgecolor=C_USER_EDGE,   label="User"),
    mpatches.Patch(facecolor=C_PROJ,   edgecolor=C_PROJ_EDGE,   label="Project"),
    mpatches.Patch(facecolor=C_ANNOT,  edgecolor=C_ANNOT_EDGE,  label="Annotation"),
    mpatches.Patch(facecolor=C_REGION, edgecolor=C_REGION_EDGE, label="Region"),
    mpatches.Patch(facecolor=C_OBJECT, edgecolor=C_OBJECT_EDGE, label="Object"),
    Line2D([0], [0], color="#888", lw=1.6, linestyle="dashed",
           label="プロジェクト境界を越える参照"),
    Line2D([0], [0], marker="s", color="none",
           markerfacecolor=C_ANNOT, markeredgecolor=C_CREATOR,
           markersize=10, label="creator (下段): 来歴 ≠ 権限"),
]
ax.legend(handles=legend_handles, loc="upper center",
          bbox_to_anchor=(0.5, 0.945), fontsize=9.5, frameon=True,
          facecolor="white", edgecolor="#cccccc", ncol=7,
          columnspacing=1.4, handletextpad=0.5)

# ──────────────────────────── Geometry ────────────────────────────
USER_Y, USER_H, USER_W = 105, 9, 22
USERS = [("User A", 18), ("User B", 90), ("User C", 160)]

PROJ_Y, PROJ_H, PROJ_W = 78, 11, 50
PROJ_A_X, PROJ_B_X = 22, 128

ANNOT_Y, ANNOT_H, ANNOT_W = 45, 14, 26
ANNOTS = [
    ("Annot A1", "creator: A", 8),
    ("Annot A2", "creator: B", 42),
    ("Annot B1", "creator: C", 114),
    ("Annot B2", "creator: A", 148),
]

REGION_Y, REGION_H, REGION_W = 22, 11, 34
REGION_R1_X, REGION_R2_X = 20, 108

OBJ_Y, OBJ_H, OBJ_W = 2, 10, 56
OBJ_X = 72


# ──────────────────────────── Draw Nodes ────────────────────────────
for label, x in USERS:
    box(x, USER_Y, USER_W, USER_H, label, C_USER, C_USER_EDGE, fontsize=12)

box(PROJ_A_X, PROJ_Y, PROJ_W, PROJ_H, "Project α",
    C_PROJ, C_PROJ_EDGE, fontsize=13)
box(PROJ_B_X, PROJ_Y, PROJ_W, PROJ_H, "Project β",
    C_PROJ, C_PROJ_EDGE, fontsize=13)

for top, bottom, x in ANNOTS:
    two_row_box(x, ANNOT_Y, ANNOT_W, ANNOT_H, top, bottom,
                C_ANNOT, C_ANNOT_EDGE,
                top_fs=12, bottom_fs=9, bottom_color=C_CREATOR)

box(REGION_R1_X, REGION_Y, REGION_W, REGION_H, "Region R1",
    C_REGION, C_REGION_EDGE, fontsize=12)
box(REGION_R2_X, REGION_Y, REGION_W, REGION_H, "Region R2",
    C_REGION, C_REGION_EDGE, fontsize=12)

box(OBJ_X, OBJ_Y, OBJ_W, OBJ_H, "Object  (IIIF Manifest)",
    C_OBJECT, C_OBJECT_EDGE, fontsize=13)


# Node-anchor utilities
def bot(x_left, w, y_top):
    return (x_left + w / 2, y_top)


def top(x_left, w, y_bot, y_top):
    return (x_left + w / 2, y_bot + (y_top - y_bot))  # 上辺中央


# ──────────────────────────── Edges ────────────────────────────

# User → Project (membership): すべてボックス下辺から Project 上辺へ。
# User A → Project α (owner)
arrow(USERS[0][1] + USER_W * 0.4, USER_Y,
      PROJ_A_X + PROJ_W * 0.3, PROJ_Y + PROJ_H,
      label="owner", color=C_USER_EDGE,
      label_xy=(28, 96), fontsize=9.5)
# User B → Project α (editor)
arrow(USERS[1][1] + USER_W * 0.3, USER_Y,
      PROJ_A_X + PROJ_W * 0.85, PROJ_Y + PROJ_H,
      label="editor", color=C_USER_EDGE,
      label_xy=(72, 96), rad=-0.12, fontsize=9.5)
# User B → Project β (editor)
arrow(USERS[1][1] + USER_W * 0.7, USER_Y,
      PROJ_B_X + PROJ_W * 0.15, PROJ_Y + PROJ_H,
      label="editor", color=C_USER_EDGE,
      label_xy=(128, 96), rad=0.12, fontsize=9.5)
# User C → Project β (viewer)
arrow(USERS[2][1] + USER_W * 0.55, USER_Y,
      PROJ_B_X + PROJ_W * 0.75, PROJ_Y + PROJ_H,
      label="viewer", color=C_USER_EDGE,
      label_xy=(173, 96), fontsize=9.5)
# User A → Project β (owner) — 大きな弧で User B/C の上を回る
arrow(USERS[0][1] + USER_W * 0.6, USER_Y + USER_H,
      PROJ_B_X + PROJ_W * 0.5, PROJ_Y + PROJ_H + 1,
      label="owner", color=C_USER_EDGE, lw=1.2,
      label_xy=(100, 128), rad=-0.42, fontsize=9.5)


# Project → Annotation (researchProjectId)
# Project α → Annot A1
arrow(PROJ_A_X + PROJ_W * 0.2, PROJ_Y,
      ANNOTS[0][2] + ANNOT_W * 0.5, ANNOT_Y + ANNOT_H,
      label="researchProjectId", color=C_PROJ_EDGE,
      label_xy=(15, 65.5), fontsize=9)
# Project α → Annot A2
arrow(PROJ_A_X + PROJ_W * 0.7, PROJ_Y,
      ANNOTS[1][2] + ANNOT_W * 0.5, ANNOT_Y + ANNOT_H,
      label="researchProjectId", color=C_PROJ_EDGE,
      label_xy=(63, 65.5), fontsize=9)
# Project β → Annot B1
arrow(PROJ_B_X + PROJ_W * 0.3, PROJ_Y,
      ANNOTS[2][2] + ANNOT_W * 0.5, ANNOT_Y + ANNOT_H,
      label="researchProjectId", color=C_PROJ_EDGE,
      label_xy=(119, 65.5), fontsize=9)
# Project β → Annot B2
arrow(PROJ_B_X + PROJ_W * 0.8, PROJ_Y,
      ANNOTS[3][2] + ANNOT_W * 0.5, ANNOT_Y + ANNOT_H,
      label="researchProjectId", color=C_PROJ_EDGE,
      label_xy=(173, 65.5), fontsize=9)


# Annot A1 ↔ Annot A2 (supports)
arrow(ANNOTS[0][2] + ANNOT_W, ANNOT_Y + ANNOT_H * 0.72,
      ANNOTS[1][2], ANNOT_Y + ANNOT_H * 0.72,
      label="supports", color="#888", style="<|-|>", lw=1.3,
      label_xy=(34, ANNOT_Y + ANNOT_H + 2.2), fontsize=9)


# Annotation → Region (regionId)
# Annot A1 → Region R1
arrow(ANNOTS[0][2] + ANNOT_W * 0.3, ANNOT_Y,
      REGION_R1_X + REGION_W * 0.3, REGION_Y + REGION_H,
      label="regionId", color=C_REGION_EDGE,
      label_xy=(13, 38), fontsize=9)
# Annot A2 → Region R1
arrow(ANNOTS[1][2] + ANNOT_W * 0.3, ANNOT_Y,
      REGION_R1_X + REGION_W * 0.7, REGION_Y + REGION_H,
      label="regionId", color=C_REGION_EDGE,
      label_xy=(50, 38), fontsize=9)
# Annot B1 → Region R2
arrow(ANNOTS[2][2] + ANNOT_W * 0.5, ANNOT_Y,
      REGION_R2_X + REGION_W * 0.5, REGION_Y + REGION_H,
      label="regionId", color=C_REGION_EDGE,
      label_xy=(127, 38), fontsize=9)
# Cross-project share (dashed): Annot B1 → Region R1 (横断参照)
arrow(ANNOTS[2][2], ANNOT_Y + ANNOT_H * 0.4,
      REGION_R1_X + REGION_W, REGION_Y + REGION_H * 0.6,
      label="regionId (横断参照)",
      color=C_REGION_EDGE, linestyle="dashed", lw=1.3, fontsize=9,
      label_xy=(85, 44), rad=0.22)


# Region → Object (target_manifest)
arrow(REGION_R1_X + REGION_W * 0.7, REGION_Y,
      OBJ_X + OBJ_W * 0.25, OBJ_Y + OBJ_H,
      label="target_manifest", color=C_OBJECT_EDGE,
      label_xy=(54, 15), fontsize=9)
arrow(REGION_R2_X + REGION_W * 0.3, REGION_Y,
      OBJ_X + OBJ_W * 0.75, OBJ_Y + OBJ_H,
      label="target_manifest", color=C_OBJECT_EDGE,
      label_xy=(130, 15), fontsize=9)

# Annot B2 → Object (isObjectLevel, Region をスキップ)。右側を大きく回避
arrow(ANNOTS[3][2] + ANNOT_W, ANNOT_Y + ANNOT_H * 0.3,
      OBJ_X + OBJ_W, OBJ_Y + OBJ_H * 0.5,
      label="target_manifest\n(isObjectLevel)",
      color=C_OBJECT_EDGE, fontsize=8.5,
      label_xy=(186, 28), rad=-0.55)


plt.tight_layout()
out_path = "/Users/junogawa/Dropbox/PC/Projects/three_sample/docs/concept-diagram.png"
plt.savefig(out_path, dpi=160, bbox_inches="tight", facecolor="white")
print(f"Wrote: {out_path}")

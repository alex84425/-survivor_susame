"""把 assets/raw/ 裡 Gemini 生成的圖去背、裁切、縮小，輸出成遊戲用的 assets/img/px_*.png

- 單張：wolf.png → px_wolf.png
- 拼圖：wolf+fox+bear.png → 依由左到右、由上到下切出三隻
- 背景：從四個角取色，從圖片邊緣做 flood fill 去掉相近顏色（洋紅、白、灰、黑底都可）
完成後更新 assets/img/px.json，遊戲依此清單載入像素圖。

用法：python tools/cutout.py [檔名 ...]
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
RAW = os.path.join(ROOT, "assets", "raw")
OUT = os.path.join(ROOT, "assets", "img")
SIZE = 160
TOL = 60  # 與背景色的距離門檻

# 地貌素材：輸出到 assets/env/<名稱>.png，清單寫入 assets/env/env.json
ENV = {"tree", "tree2", "bush", "stone", "flower", "tuft", "stump", "pond"}
ENV_OUT = os.path.join(ROOT, "assets", "env")

KNOWN = {"bat", "goblin", "wolf", "fox", "spider", "snake", "scorpion", "boar", "crocodile", "bear", "ogre",
         "dragon", "tiger", "lion", "trex", "gorilla", "mage", "fencer"}


def remove_bg(im):
    a = np.asarray(im.convert("RGBA")).astype(np.int32)
    rgb = a[..., :3]
    h, w = rgb.shape[:2]
    corners = np.array([rgb[2, 2], rgb[2, w - 3], rgb[h - 3, 2], rgb[h - 3, w - 3]])
    bg = np.median(corners, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    # 洋紅色系另外放寬（Gemini 的洋紅常有漸層）
    magenta = (rgb[..., 0] > 140) & (rgb[..., 2] > 140) & (rgb[..., 1] < 120)
    cand = (dist < TOL) | (magenta if (bg[0] > 150 and bg[2] > 150 and bg[1] < 120) else False)
    # 只去掉和邊緣相連的背景，避免把妖獸身上相近的顏色挖空
    lab, _ = ndimage.label(cand)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    mask_bg = np.isin(lab, list(edge))
    # 也去掉被包住的大片洋紅（例如尾巴和身體之間的空隙）
    if magenta.any():
        lab2, n2 = ndimage.label(magenta & ~mask_bg)
        if n2:
            sizes = ndimage.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
            big = [i + 1 for i, s in enumerate(sizes) if s > 40]
            mask_bg |= np.isin(lab2, big)
    out = a.copy()
    out[mask_bg, 3] = 0
    # 去掉邊緣殘留的洋紅色暈
    fg = ~mask_bg
    border = fg & ndimage.binary_dilation(mask_bg, iterations=1)
    fringe = border & (rgb[..., 0] > 120) & (rgb[..., 2] > 120) & (rgb[..., 1] < 100)
    out[fringe, 3] = 0
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def square(im):
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    s = max(im.size)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(im, ((s - im.size[0]) // 2, (s - im.size[1]) // 2))
    return sq.resize((SIZE, SIZE), Image.LANCZOS if s < SIZE * 2 else Image.NEAREST)


def grid_layout(n):
    """每列最多 3 隻：6 → 3+3、5 → 3+2、4 → 2+2、≤3 → 單列"""
    if n <= 3:
        return [n]
    if n == 4:
        return [2, 2]
    return [3] * (n // 3) + ([n % 3] if n % 3 else [])


def split_sheet(im, n):
    """依網格位置切出 n 隻（由左到右、由上到下）。
    每個不透明區塊整塊歸給中心最近的格子；若兩隻黏在一起，就逐像素分給最近的格子。"""
    arr = np.asarray(im).copy()
    alpha = arr[..., 3] > 0
    h, w = alpha.shape
    rows = grid_layout(n)
    centers = []
    for r, k in enumerate(rows):
        for j in range(k):
            centers.append(((j + 0.5) * w / k, (r + 0.5) * h / len(rows)))
    centers = np.array(centers)
    ys, xs = np.mgrid[0:h, 0:w]
    # 每個像素最近的格子（列距離加權，避免上下列互搶）
    dist = (xs[None] - centers[:, 0, None, None]) ** 2 + (2 * (ys[None] - centers[:, 1, None, None])) ** 2
    nearest = dist.argmin(axis=0)
    owner = np.full((h, w), -1)
    lab, cnt = ndimage.label(alpha)
    for i in range(1, cnt + 1):
        m = lab == i
        if m.sum() < 30:
            continue  # 雜點
        votes = np.bincount(nearest[m], minlength=n)
        if votes.max() >= 0.9 * m.sum():
            owner[m] = votes.argmax()
        else:
            owner[m] = nearest[m]
    parts = []
    for c in range(n):
        m = owner == c
        if not m.any():
            raise RuntimeError(f"第 {c + 1} 格是空的，排列可能和檔名順序不符")
        yy, xx = np.where(m)
        y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
        piece = arr[y0:y1, x0:x1].copy()
        piece[~m[y0:y1, x0:x1], 3] = 0
        parts.append(Image.fromarray(piece, "RGBA"))
    return parts


def process(fn):
    stem = os.path.splitext(fn)[0].lower()
    names = [s.strip() for s in stem.split("+")]
    bad = [n for n in names if n not in KNOWN and n not in ENV]
    if bad:
        print(f"  略過 {fn}：不認得的名稱 {bad}")
        return []
    im = remove_bg(Image.open(os.path.join(RAW, fn)))
    pieces = [im] if len(names) == 1 else split_sheet(im, len(names))
    for name, p in zip(names, pieces):
        if name in ENV:
            os.makedirs(ENV_OUT, exist_ok=True)
            square(p).save(os.path.join(ENV_OUT, f"{name}.png"))
            print(f"  {fn} → env/{name}.png")
        else:
            square(p).save(os.path.join(OUT, f"px_{name}.png"))
            print(f"  {fn} → px_{name}.png")
    return names


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    files = sys.argv[1:] or sorted(f for f in os.listdir(RAW) if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")))
    for fn in files:
        try:
            process(fn)
        except Exception as e:
            print(f"  {fn} 失敗：{e}")
    envs = sorted(n for n in ENV | {"grass"} if os.path.exists(os.path.join(ENV_OUT, f"{n}.png")))
    os.makedirs(ENV_OUT, exist_ok=True)
    with open(os.path.join(ENV_OUT, "env.json"), "w", encoding="utf-8") as f:
        json.dump(envs, f)
    print(f"env.json：{envs}")
    have = sorted(n for n in KNOWN if os.path.exists(os.path.join(OUT, f"px_{n}.png")))
    with open(os.path.join(OUT, "px.json"), "w", encoding="utf-8") as f:
        json.dump(have, f)
    print(f"px.json：{len(have)} 張像素圖 {have}")


if __name__ == "__main__":
    main()

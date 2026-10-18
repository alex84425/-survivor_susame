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


def split_sheet(im, n):
    """依不透明區塊切出 n 隻，排序：由上到下分列、列內由左到右"""
    alpha = np.asarray(im)[..., 3] > 0
    # 先膨脹把同一隻的碎片（例如分開的翅膀）黏在一起
    grown = ndimage.binary_dilation(alpha, iterations=max(4, im.size[0] // 120))
    lab, cnt = ndimage.label(grown)
    if cnt < n:
        raise RuntimeError(f"只找到 {cnt} 個區塊，少於 {n} 隻；請讓妖獸之間留更多空白")
    sizes = ndimage.sum(alpha, lab, range(1, cnt + 1))
    keep = sorted(range(1, cnt + 1), key=lambda i: -sizes[i - 1])[:n]
    boxes = []
    for i in keep:
        ys, xs = np.where(lab == i)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, i))
    # 分列：中心點 y 相近的歸同一列
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], [boxes[0]]
    for b in boxes[1:]:
        prev = cur[-1]
        if (b[1] + b[3]) / 2 - (prev[1] + prev[3]) / 2 < (prev[3] - prev[1]) * 0.5:
            cur.append(b)
        else:
            rows.append(cur); cur = [b]
    rows.append(cur)
    ordered = [b for r in rows for b in sorted(r, key=lambda b: b[0])]
    arr = np.asarray(im).copy()
    parts = []
    for x0, y0, x1, y1, i in ordered:
        piece = arr[y0:y1, x0:x1].copy()
        piece[lab[y0:y1, x0:x1] != i, 3] = 0
        parts.append(Image.fromarray(piece, "RGBA"))
    return parts


def process(fn):
    stem = os.path.splitext(fn)[0].lower()
    names = [s.strip() for s in stem.split("+")]
    bad = [n for n in names if n not in KNOWN]
    if bad:
        print(f"  略過 {fn}：不認得的名稱 {bad}")
        return []
    im = remove_bg(Image.open(os.path.join(RAW, fn)))
    pieces = [im] if len(names) == 1 else split_sheet(im, len(names))
    for name, p in zip(names, pieces):
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
    have = sorted(n for n in KNOWN if os.path.exists(os.path.join(OUT, f"px_{n}.png")))
    with open(os.path.join(OUT, "px.json"), "w", encoding="utf-8") as f:
        json.dump(have, f)
    print(f"px.json：{len(have)} 張像素圖 {have}")


if __name__ == "__main__":
    main()

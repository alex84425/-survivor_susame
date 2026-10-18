"""把一張草地圖變成可無縫平鋪的底圖：取中央正方形 → 縮小 → 與錯位半格的自己用漸層混合消除接縫。
用法：python tools/seamless.py assets/raw/grass.jpg [輸出邊長，預設 256]
輸出：assets/env/grass.png，並更新 assets/env/env.json
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ENV = os.path.join(ROOT, "assets", "env")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    src, size = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 256
    im = Image.open(src).convert("RGB")
    s = min(im.size)
    m = int(s * 0.08)  # 去掉邊緣可能的暈影
    im = im.crop(((im.width - s) // 2 + m, (im.height - s) // 2 + m, (im.width + s) // 2 - m, (im.height + s) // 2 - m))
    im = im.resize((size, size), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    shifted = np.roll(np.roll(a, size // 2, axis=0), size // 2, axis=1)
    # 權重：中央用原圖、靠近邊緣用錯位圖（錯位圖的中央就是原圖的邊緣，天然可平鋪）
    y, x = np.mgrid[0:size, 0:size] / (size - 1)
    w = np.minimum(np.minimum(x, 1 - x), np.minimum(y, 1 - y)) * 2  # 0 邊緣 → 1 中央
    w = np.clip(w * 2.2, 0, 1)[..., None]
    out = a * w + shifted * (1 - w)
    os.makedirs(ENV, exist_ok=True)
    Image.fromarray(out.astype(np.uint8)).save(os.path.join(ENV, "grass.png"))
    lst_p = os.path.join(ENV, "env.json")
    lst = json.load(open(lst_p, encoding="utf-8")) if os.path.exists(lst_p) else []
    if "grass" not in lst:
        lst.append("grass")
    json.dump(sorted(lst), open(lst_p, "w", encoding="utf-8"))
    print("grass.png", size, "env.json", sorted(lst))


if __name__ == "__main__":
    main()

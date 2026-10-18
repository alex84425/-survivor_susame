"""用 Gemini 生成像素妖獸圖，去背後存到遊戲 assets/img/px_*.png
用法：GEMINI_API_KEY=... python gen_px.py [model] [name ...]
"""
import base64, io, json, os, sys, time, urllib.request
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img")
RAW = os.path.join(os.path.dirname(__file__), "raw")  # 原圖暫存（不進版控）
os.makedirs(RAW, exist_ok=True)
KEY = os.environ["GEMINI_API_KEY"]

STYLE = ("Pixel art game sprite, 16-bit SNES style with chunky visible pixels and a bold dark outline. "
         "Chinese xianxia cultivation-world demon beast. Extremely ferocious and menacing: bared fangs, snarling, "
         "glowing angry eyes, aggressive attack pose. Single creature, full body, centered, side view facing LEFT. "
         "Background must be one solid flat pure magenta color (#FF00FF) everywhere, no gradient, no scenery, "
         "no ground, no shadow, no text, no border.")

SUBJECTS = {
    "bat": "a demonic blood bat with torn leathery wings and needle fangs",
    "goblin": "a small vicious horned imp demon with claws and a wicked grin",
    "wolf": "a three-eyed demon wolf with dark blue fur, glowing third eye, raised hackles",
    "fox": "a nine-tailed white demon fox with flaming spectral tails and sharp teeth",
    "spider": "a giant venomous demon spider with red markings dripping green poison",
    "snake": "a fire-scaled serpent demon with flames along its body, mouth open showing fangs",
    "scorpion": "a giant armored black demon scorpion with glowing venom stinger raised",
    "boar": "a huge demon boar with massive tusks, red eyes, spiked bristles, charging",
    "crocodile": "a jade-scaled demon crocodile with spiked back, jaws wide open",
    "bear": "a hulking scarred demon bear standing on hind legs roaring with huge claws",
    "ogre": "a hulking red-skinned demon general ogre with horns, armor and a giant spiked club",
    "dragon": "a colossal serpentine Chinese flood dragon (jiao) boss with horns, whiskers, storm aura, roaring",
    "tiger": "a giant white-and-orange winged demon tiger king boss with feathered wings spread, roaring",
    "lion": "a monstrous golden demon lion king boss with flaming mane and glowing eyes, roaring",
    "trex": "a gigantic armored lizard dragon boss with bone spikes and lava cracks, roaring",
    "gorilla": "a giant black demon ape king boss with glowing red eyes, pounding chest, muscular",
    "toad": "a giant jade poison toad demon with warts oozing green toxic mist, mouth open",
    "mage": "a heroic young Chinese cultivator in white and gold robes holding a glowing flying sword, facing RIGHT, determined (not a monster)",
    "fencer": "a wandering Chinese swordsman cultivator in grey robes with a straw hat and sword, facing LEFT (not a monster)",
}


def call(model, prompt):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    for part in data["candidates"][0]["content"]["parts"]:
        if "inlineData" in part:
            return base64.b64decode(part["inlineData"]["data"])
    raise RuntimeError("no image in response: " + json.dumps(data)[:300])


def cutout(png_bytes):
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # 洋紅背景：R、B 高且 G 低
            if r > 150 and b > 150 and g < 110 and abs(r - b) < 90:
                px[x, y] = (0, 0, 0, 0)
            elif r > 120 and b > 120 and g < 80:
                px[x, y] = (0, 0, 0, 0)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    # 置中放進正方形並縮小（最近鄰，保持像素感）
    s = max(im.size)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(im, ((s - im.size[0]) // 2, (s - im.size[1]) // 2))
    return sq.resize((160, 160), Image.NEAREST)


def main():
    model = sys.argv[1] if len(sys.argv) > 1 else "gemini-2.5-flash-image"
    names = sys.argv[2:] or list(SUBJECTS)
    for n in names:
        for attempt in range(3):
            try:
                raw = call(model, f"{STYLE} Subject: {SUBJECTS[n]}.")
                open(os.path.join(RAW, n + ".png"), "wb").write(raw)
                cutout(raw).save(os.path.join(OUT, f"px_{n}.png"))
                print(n, "ok", flush=True)
                break
            except urllib.error.HTTPError as e:
                print(n, "HTTP", e.code, e.read()[:300], flush=True)
                if e.code in (429, 503):
                    time.sleep(20)
                    continue
                break
            except Exception as e:
                print(n, "ERR", e, flush=True)
                time.sleep(3)


if __name__ == "__main__":
    main()

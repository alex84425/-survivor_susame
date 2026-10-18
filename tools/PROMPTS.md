# 用 Gemini 網頁版生成像素妖獸

## 做法

1. 打開 https://gemini.google.com ，複製下面的「共用風格」加上某一隻的「描述」貼上。
2. 下載圖片，**用指定檔名**存到 `assets/raw/`（例如 `wolf.png`）。
3. 全部存好後跟 Claude 說「圖放好了」，或自己執行：

   ```bash
   python tools/cutout.py
   ```

   腳本會自動去背、裁切、縮小，輸出到 `assets/img/px_*.png`，遊戲重新整理就會換上。
   沒放的妖獸會繼續用原本的 3D 圖，所以可以分批做。

### 一次生多隻（省次數）

也可以一張圖放好幾隻，檔名用 `+` 串起來，順序是**由左到右、由上到下**：

- `wolf+fox+bear+boar+spider+snake.png`（3 欄 × 2 列）

這時提示詞加一句：`Arrange the N creatures in a neat grid with lots of empty space between them, no labels.`

## 共用風格（每次都貼）

```
Pixel art game sprite, 16-bit SNES style, chunky visible pixels, bold dark outline.
Chinese xianxia cultivation-world demon beast. Extremely ferocious and menacing:
bared fangs, snarling, glowing angry eyes, aggressive attack pose.
Single creature, full body, centered, side view facing LEFT.
Background: one solid flat pure magenta color (#FF00FF), no gradient, no scenery,
no ground, no shadow, no text, no labels, no border.
Subject:
```

> 重點：**純洋紅色背景、不要文字**，去背才會乾淨。若 Gemini 給了別的純色背景也可以，腳本會從四個角自動判斷背景色。

## 檔名與描述

| 檔名 | 遊戲中 | 描述（接在 Subject: 後面） |
|---|---|---|
| `bat.png` | 蝠妖 | a demonic blood bat with torn leathery wings and needle fangs |
| `goblin.png` | 小鬼 | a small vicious horned imp demon with claws and a wicked grin |
| `wolf.png` | 妖狼 | a three-eyed demon wolf with dark blue fur, glowing third eye, raised hackles |
| `fox.png` | 狐妖 | a nine-tailed white demon fox with spectral flaming tails and sharp teeth |
| `spider.png` | 毒蛛 | a giant venomous demon spider with red markings dripping green poison |
| `snake.png` | 蛇妖 | a fire-scaled serpent demon wreathed in flames, mouth open showing fangs |
| `scorpion.png` | 蠍妖 | a giant armored black demon scorpion with a glowing venom stinger raised |
| `boar.png` | 豬妖 | a huge demon boar with massive tusks, red eyes, spiked bristles, charging |
| `crocodile.png` | 鱷妖 | a jade-scaled demon crocodile with a spiked back, jaws wide open |
| `bear.png` | 妖熊 | a hulking scarred demon bear on hind legs roaring with huge claws |
| `ogre.png` | 鬼將 | a hulking red-skinned demon general with horns, armor and a giant spiked club |
| `dragon.png` | 蛟龍王 | a colossal serpentine Chinese flood dragon boss with horns, whiskers, storm aura, roaring |
| `tiger.png` | 虎王 | a giant winged demon tiger king boss with feathered wings spread, roaring |
| `lion.png` | 獅王 | a monstrous golden demon lion king boss with a flaming mane and glowing eyes |
| `trex.png` | 暴龍王 | a gigantic armored lizard dragon boss with bone spikes and glowing lava cracks |
| `gorilla.png` | 猿王 | a giant black demon ape king boss with glowing red eyes, pounding its chest |
| `mage.png` | 玩家 | a heroic young Chinese cultivator in white and gold robes riding a glowing flying sword, facing RIGHT, determined (not a monster) |
| `fencer.png` | 路人修士 | a wandering Chinese swordsman cultivator in grey robes with a straw hat and sword (not a monster) |

玩家和路人不是妖獸，把共用風格裡的 `demon beast. Extremely ferocious...attack pose.` 那兩句拿掉即可。

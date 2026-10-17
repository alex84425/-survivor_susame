# -survivor_susame　修仙倖存者

人類修士與妖獸大戰的倖存者類遊戲（Phaser 3，網頁版）。每場 30 分鐘、不能暫停，暫停本身就是資源（神識）。

完整設計見 [DESIGN.md](DESIGN.md)。

## 執行

需要本地伺服器（ES module 不能用 file:// 開）：

```bash
python -m http.server 8770
```

打開 http://localhost:8770 。測試用短局：http://localhost:8770/?min=10 （10 分鐘一局，難度曲線等比壓縮）。

## 操作

| 按鍵 | 作用 |
|---|---|
| WASD / 方向鍵 | 移動 |
| 空白（按住） | 打坐：停止攻擊，把靈石煉化成修為 |
| Q（按住） | 神識時緩：妖獸與其投射物變慢（依境界差） |
| R | 神識收寶：吸取大範圍掉落物 |
| E | 與路人結伴 |
| F | 攻擊路人 |
| 1 / 2 / 3 | 升級選擇（遊戲不停，時間到隨機） |
| Z / X / C | 在宗門範圍內購買功法神通 |
| M / B | 靜音 / 開關背景音樂 |

## 結構

- `src/data.js`：五行、境界、神通、妖獸、名稱產生器
- `src/main.js`：遊戲主場景（戰鬥、宗門、煉器、路人、天劫）
- `src/ui.js`：DOM 介面
- `src/sfx.js`：合成音效與背景音樂
- `assets/img/`：妖獸與道具圖片（Microsoft Fluent Emoji，MIT 授權，見 [assets/CREDITS.md](assets/CREDITS.md)）

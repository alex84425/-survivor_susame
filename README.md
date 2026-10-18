# -survivor_susame　修仙倖存者

人類修士與妖獸大戰（Phaser 3，網頁版），黑夜君臨式玩法：大地圖上點亮篝火、清剿妖巢、搶神通湊流派，三夜之內斬殺妖皇。怪物少而精、招式有預警，靠閃避取勝。

舊的倖存者版本在 `survivor-v1` 分支。

完整設計見 [DESIGN.md](DESIGN.md)。

## 執行

需要本地伺服器（ES module 不能用 file:// 開）。這個伺服器會關閉快取，改完程式直接重新整理就生效：

```bash
python tools/serve.py
```

打開 http://localhost:8770 。測試用短局：http://localhost:8770/?min=10 （10 分鐘一局，難度曲線等比壓縮）。

## 百科

http://localhost:8770/wiki.html ：神通（各等級×品階傷害、打木樁預覽與實測 DPS）、功法、合成與公式、妖獸圖鑑、數值平衡計算器。
所有公式集中在 `src/formula.js`，遊戲與百科共用。

## 操作

| 按鍵 | 作用 |
|---|---|
| WASD | 移動 |
| 滑鼠 | 瞄準 |
| 左鍵・右鍵・Q・E | 施放四格神通（按住連發） |
| 空白 | 閃避（短暫無敵） |
| Shift（按住） | 神識時緩 |
| F | 篝火休息（升級、回血、煉器）、機緣據點、路人結伴、陣營戰助陣 |
| 1～5 | 抉擇 |
| M / B | 靜音 / 開關背景音樂 |

## 結構

- `src/data.js`：五行、境界、神通、妖獸、名稱產生器
- `src/main.js`：遊戲主場景（戰鬥、宗門、煉器、路人、天劫）
- `src/ui.js`：DOM 介面
- `src/sfx.js`：合成音效與背景音樂
- `src/formula.js`：所有數值公式（遊戲與百科共用）
- `wiki.html`、`src/wiki.js`：百科
- `tools/sim.js`：自動模擬（數值平衡）
- `assets/img/`：妖獸與道具圖片（Microsoft Fluent Emoji，MIT 授權，見 [assets/CREDITS.md](assets/CREDITS.md)）

# -survivor_susame　修仙（黑帝斯 × 黑夜君臨）

人類修士與妖獸大戰的動作遊戲（Phaser 3，網頁版）。開局選主修五行職業，讀招、閃避、打破綻、處決——單挑的快感。

目前是**第一階段：單挑手感測試場**（五職業、三種妖獸、妖王翼虎）。完整規劃見 [DESIGN.md](DESIGN.md)。

舊版本：`legacy.html`（第一版黑夜君臨改造，可玩）；分支 `survivor-v1`（倖存者）、`nightreign-v1`。

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
| 1～5 / 點卡片 | 選擇主修（金・追獵者、木・遊俠、水・御法者、火・術士、土・體修） |
| WASD | 移動 |
| 滑鼠 | 瞄準（有輕微自動修正） |
| 左鍵 | 普攻（金三段劍擊、木連射追蹤、水鞭、火按住蓄力、土重拳） |
| 右鍵 | 戰技（消耗真元） |
| Q | 大招（打出傷害累積） |
| 空白 | 閃避；敵人出手瞬間閃開＝完美閃避（神識時緩、下一擊暴擊） |
| R | 丹藥（3 瓶） |
| F | 敵人破綻時處決；篝火休息（回滿並重置妖獸） |
| M / B | 靜音 / 開關背景音樂 |

## 結構

- `src/v3/`：新版（`game.js` 場景與戰鬥、`kits.js` 職業與妖獸招式數值、`gfx.js` 貼圖）
- `src/data.js`：五行、境界、神通、妖獸、名稱產生器
- `src/main.js`：遊戲主場景（戰鬥、宗門、煉器、路人、天劫）
- `src/ui.js`：DOM 介面
- `src/sfx.js`：合成音效與背景音樂
- `src/formula.js`：所有數值公式（遊戲與百科共用）
- `wiki.html`、`src/wiki.js`：百科
- `tools/sim.js`：自動模擬（數值平衡）
- `assets/img/`：妖獸與道具圖片（Microsoft Fluent Emoji，MIT 授權，見 [assets/CREDITS.md](assets/CREDITS.md)）

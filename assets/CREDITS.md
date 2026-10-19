# 素材來源

`assets/img/px_*.png`：像素妖獸與角色，由 Google Gemini 生成（2026-10-18），經 `tools/cutout.py` 去背裁切。

其餘 `assets/img/*.png`（3D 風格，像素圖缺漏時的備用）來自 Microsoft **Fluent Emoji**（3D 風格），MIT 授權。
https://github.com/microsoft/fluentui-emoji （commit 1ffb34c752ecf5d402f04cfb4b392c77f57c54bc）

Copyright (c) Microsoft Corporation. Licensed under the MIT License.

`assets/env/*.png`：草原底圖與地貌物件，由 Google Gemini 生成（2026-10-18）。

`assets/vfx/*.png`：Kenney Particle Pack 1.1（https://kenney.nl/assets/particle-pack），CC0。授權見 `assets/vfx/License-Kenney.txt`。

## assets/ai/（2026-10-19）
本機 AI 生成：圖片用 Qwen-Image 2.1（Comfy-Org 官方權重），動畫用 MiniMax H3（社群授權），透過 ComfyUI 產生，再由 `tools/import_ai.py` 去背、縮圖、拆序列幀。
Qwen-Image 2.1 為非商業授權、MiniMax H3 商用需另購授權：本專案僅供非商業使用。

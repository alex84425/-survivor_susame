"""把本機 AI 生成的素材（G:\\AI\\comfy_tools\\out）整理進遊戲 assets/ai/。
- 角色、妖獸、道具：用去背版，裁邊、縮到固定高度
- 特效：黑底轉透明（越亮越不透明）
- 動畫：取 N 幀、去背、排成橫條精靈圖
最後寫 assets/ai/manifest.json，遊戲依它載入。
用法：python tools/import_ai.py
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = r'G:/AI/comfy_tools/out'
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'ai')
sys.stdout.reconfigure(encoding='utf-8')

# ---------- 使用者挑選（2026-10-19）與 Claude 補選 ----------
CHARS = {'jin_m': 3, 'jin_f': 2, 'mu_m': 1, 'mu_f': 2, 'shui_m': 2, 'shui_f': 3, 'huo_m': 3, 'huo_f': 3, 'tu_m': 1, 'tu_f': 3}
# 妖獸：[帥氣版（低等級）, 恐怖版（高等級、夜王狂怒）]；只挑一種就兩個都用它
MONSTERS = {
    'wolf': ('monsters_existing/wolf_cool_1', 'monsters_existing/wolf_scary_2'),
    'bear': ('monsters_existing/bear_cool_3', 'monsters_existing/bear_scary_3'),
    'spider': ('monsters_existing/spider_scary_2', 'monsters_existing/spider_scary_2'),
    'boar': ('monsters_existing/boar_cool_3', 'monsters_existing/boar_scary_2'),
    'snake': ('monsters_existing/snake_scary_2', 'monsters_existing/snake_scary_2'),
    'ogre': ('monsters_existing/ogre_cool_2', 'monsters_existing/ogre_scary_2'),
    'tiger': ('monsters_existing/tiger_cool_2', 'monsters_existing/tiger_scary_3'),
    'dragon': ('monsters_existing/dragon_cool_2', 'monsters_existing/dragon_scary_2'),
    'emperor': ('monsters_existing/emperor_cool_1', 'monsters_existing/emperor_scary_1'),
    'bat': ('monsters_new/bat_weird_2', 'monsters_new/bat_weird_2'),
    'crane': ('monsters_new/crane_scary_1', 'monsters_new/crane_scary_1'),
    'golem': ('monsters_new/golem_cool_1', 'monsters_new/golem_scary_2'),
    'jiangshi': ('monsters_new/jiangshi_scary_1', 'monsters_new/jiangshi_scary_1'),
    'python': ('monsters_new/python_cool_2', 'monsters_new/python_scary_2'),
    'scorpion': ('monsters_new/scorpion_cool_2', 'monsters_new/scorpion_scary_1'),
    'tianmo': ('monsters_new/tianmo_cool_1', 'monsters_new/tianmo_scary_1'),
    'toad': ('monsters_new/toad_cool_1', 'monsters_new/toad_cool_1'),
    'wisp': ('monsters_new/wisp_cool_2', 'monsters_new/wisp_scary_1'),
    'blooddemon': ('bosses_new/blooddemon_cool_1', 'bosses_new/blooddemon_cool_1'),
    'corpseking': ('bosses_new/corpseking_cool_2', 'bosses_new/corpseking_cool_2'),
    'turtle': ('bosses_new/mountainturtle_scary_2', 'bosses_new/mountainturtle_scary_2'),
    'ninetail': ('bosses_new/ninetail_weird_2', 'bosses_new/ninetail_weird_2'),
    'thunderbird': ('bosses_new/thunderbird_scary_1', 'bosses_new/thunderbird_scary_1'),
}
BOSSES = {'tiger', 'dragon', 'emperor', 'blooddemon', 'corpseking', 'turtle', 'ninetail', 'thunderbird'}
VFX = ['aura_flame_2', 'blood_burst_2', 'dodge_ghost_2', 'earth_crack_2', 'execute_2', 'fire_burst_2', 'fire_pillar_2', 'fireball_2', 'golden_bell_1',
       'heal_1', 'hit_spark_1', 'ice_burst_2', 'ice_ring_2', 'leaf_storm_3', 'lightning_2', 'magic_circle_huo_1', 'magic_circle_jin_3', 'magic_circle_mu_1',
       'magic_circle_shui_1', 'magic_circle_tu_1', 'meteor_2', 'phoenix_3', 'poison_cloud_2', 'portal_2', 'rock_spikes_2', 'shockwave_3', 'slash_cross_1',
       'slash_gold_3', 'stone_seal_2', 'sword_qi_2']
# 特效動畫（昨晚 H3 生成）→ 序列幀
VFX_ANIM = ['fire_burst_anim', 'slash_anim', 'lightning_anim', 'ice_burst_anim', 'execute_anim', 'hit_spark_anim', 'shockwave_anim', 'earth_crack_anim',
            'stone_seal_anim', 'phoenix_anim', 'circle_anim', 'blood_burst_anim']
ICON_V2 = {'bengshan': 2, 'bingzhui': 1, 'chanteng': 2, 'dilie': 3, 'duji': 2, 'feijian': 3, 'fentian': 2, 'handi': 2, 'hanyu': 2, 'huoqiu': 2, 'huti': 2,
           'jianqi': 2, 'jinghua': 1, 'jingtao': 1, 'liuyun': 1, 'longjuan': 1, 'luoshi': 2, 'sanjiao': 2, 'sheji': 2, 'tengbian': 2, 'tianjian': 1,
           'wanmu': 2, 'xuanbing': 2, 'yanbao': 2, 'zhantie': 2, 'zhuque': 3, 'zhuxian': 1, 'jinzhong': 1, 'yanlong': 1, 'yanjia': 1}
ICON_V1 = {'huichun': 2}
ITEMS = ['bonfire_2', 'chest_1', 'chest_open_1', 'flask_1', 'runes_1', 'mat1_1', 'mat2_1', 'mat3_1', 'mat4_1', 'scroll_1', 'beast_core_1']
ENV = ['camp_nest_1', 'stone_lantern_1', 'ruin_pillar_2', 'grave_1', 'statue_1', 'herb_patch_1']


def fit(im, h=None, m=None):
    """裁到有內容的範圍，縮到高度 h 或最長邊 m。"""
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    if h:
        im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
    elif m and max(im.size) > m:
        k = m / max(im.size)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    return im


def lum_alpha(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    alpha = np.clip((a.max(axis=2) - 12) * 1.4, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')


def white_alpha(im):
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    near = (a.min(axis=2) > 232) & (a.max(axis=2) - a.min(axis=2) < 18)
    lab, _ = ndimage.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    alpha = np.where(np.isin(lab, list(border)), 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')


def strip(frames, out, cell):
    """幀排成橫條，每格 cell×cell，內容置中靠下。"""
    W = Image.new('RGBA', (cell * len(frames), cell), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        f = f.copy()
        f.thumbnail((cell, cell), Image.LANCZOS)
        W.paste(f, (i * cell + (cell - f.width) // 2, cell - f.height), f)
    W.save(out, 'WEBP', quality=86, method=5)


def save(im, *parts):
    p = os.path.join(DST, *parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    p = os.path.splitext(p)[0] + '.webp'
    im.save(p, 'WEBP', quality=88, method=5)
    return '/'.join(['assets/ai', *parts[:-1], os.path.splitext(parts[-1])[0] + '.webp'])


man = {'char': {}, 'mon': {}, 'vfx': {}, 'vfxanim': {}, 'icon': {}, 'item': {}, 'env': {}, 'charanim': {}}
for k, v in CHARS.items():
    man['char'][k] = save(fit(Image.open(f'{SRC}/png/cool/{k}_{v}.png'), h=256), 'char', f'{k}.png')
for k, (a, b) in MONSTERS.items():
    m = 512 if k in BOSSES else 320
    for tag, src in (('cool', a), ('scary', b)):
        g, n = src.split('/')
        man['mon'][f'{k}_{tag}'] = save(fit(Image.open(f'{SRC}/png/{g}/{n}.png'), m=m), 'mon', f'{k}_{tag}.png')
for n in VFX:
    k = n.rsplit('_', 1)[0]
    man['vfx'][k] = save(fit(lum_alpha(Image.open(f'{SRC}/night/vfx/{n}.png')), m=512), 'vfx', f'{k}.png')
# 序列圖：4×2 格，切成 8 幀
for n, k in (('sprite_sheet_explosion_2', 'sheet_explosion'), ('sprite_sheet_slash_1', 'sheet_slash')):
    im = lum_alpha(Image.open(f'{SRC}/night/vfx/{n}.png'))
    w, h = im.width // 4, im.height // 2
    frames = [im.crop((c * w, r * h, (c + 1) * w, (r + 1) * h)) for r in range(2) for c in range(4)]
    os.makedirs(os.path.join(DST, 'vfx'), exist_ok=True)
    strip(frames, os.path.join(DST, 'vfx', f'{k}.webp'), 192)
    man['vfxanim'][k] = {'src': f'assets/ai/vfx/{k}.webp', 'frames': 8, 'size': 192}
for k in VFX_ANIM:
    fs = sorted(glob.glob(f'{SRC}/night/anim/{k}/*.png'))
    if not fs:
        continue
    pick = fs[::max(1, len(fs) // 14)][:14]
    frames = [lum_alpha(Image.open(f)) for f in pick]
    strip(frames, os.path.join(DST, 'vfx', f'{k}.webp'), 256)
    man['vfxanim'][k] = {'src': f'assets/ai/vfx/{k}.webp', 'frames': len(frames), 'size': 256}
for k, v in ICON_V2.items():
    man['icon'][k] = save(fit(Image.open(f'{SRC}/night/skill_icons2/{k}_{v}.png').convert('RGBA'), h=128), 'icon', f'{k}.png')
for k, v in ICON_V1.items():
    man['icon'][k] = save(fit(Image.open(f'{SRC}/night/skill_icons/{k}_{v}.png').convert('RGBA'), h=128), 'icon', f'{k}.png')
for n in ITEMS:
    k = n.rsplit('_', 1)[0]
    man['item'][k] = save(fit(Image.open(f'{SRC}/png/items/{n}.png'), m=160), 'item', f'{k}.png')
for n in ENV:
    k = n.rsplit('_', 1)[0]
    man['env'][k] = save(fit(Image.open(f'{SRC}/png/env/{n}.png'), m=256), 'env', f'{k}.png')
# 主角動畫（有生好的才放）：每段取 12 幀，白底去背
for k in CHARS:
    for act in ('idle', 'attack', 'run'):
        fs = sorted(glob.glob(f'{SRC}/night/char_anim/{k}_{act}/*.png'))
        if len(fs) < 10:
            continue
        pick = fs[::max(1, len(fs) // 12)][:12]
        frames = [white_alpha(Image.open(f)) for f in pick]
        bb = None
        for f in frames:
            b = f.getbbox()
            bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
        frames = [f.crop(bb) for f in frames]
        cell = 256
        os.makedirs(os.path.join(DST, 'charanim'), exist_ok=True)
        strip(frames, os.path.join(DST, 'charanim', f'{k}_{act}.webp'), cell)
        man['charanim'][f'{k}_{act}'] = {'src': f'assets/ai/charanim/{k}_{act}.webp', 'frames': len(frames), 'size': cell}
json.dump(man, open(os.path.join(DST, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in man.items()})

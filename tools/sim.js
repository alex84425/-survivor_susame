// 數值平衡用的自動模擬：在瀏覽器主控台執行
//   const sim = await import('/tools/sim.js'); await sim.ready(); sim.run(8)   // 跑 8 個遊戲分鐘
// 機器人會：留在結界內、去用機緣據點、幫陣營戰的左方、有錢就去宗門買、閒著打坐。
// 玩家受到的傷害只記錄不扣血（god 模式），用 dps 欄位判斷危險程度。

const scene = () => window.game.scene.getScene('main');

export async function ready() {
  window.game.loop.wake();
  for (let i = 0; i < 80; i++) {
    const sc = scene();
    if (sc && sc.P && sc.phaseOrder && sc.sys.settings.status === 5) break;
    await new Promise(r => setTimeout(r, 250));
    // 背景分頁不會觸發 requestAnimationFrame，手動推進一幀讓場景完成建立
    window.game.step(performance.now(), 16);
  }
  const sc = scene();
  window.game.loop.sleep();
  const S = window.SIM = { i: 0, dmg: 0, win: 0, log: [], err: null, seen: { wash: 0, forge: 0, battles: 0, bosses: [], killed: [], acts: {} } };
  sc.damagePlayer = d => { S.dmg += d; S.win += d; };
  const open = sc.openEvent.bind(sc);
  sc.openEvent = (t, o, d, tm) => { S.seen[t.startsWith('洗') ? 'wash' : 'forge']++; return open(t, o, d, tm); };
  const kill = sc.killEnemy.bind(sc);
  sc.killEnemy = e => { if (e.boss) S.seen.killed.push(`${e.type}@${sc.gm.toFixed(1)}（${(sc.gm - e._t).toFixed(1)} 分）`); return kill(e); };
  return 'ready';
}

export function run(minutes, every = 2) {
  const sc = scene(), S = window.SIM, P = sc.P, frames = Math.round(minutes * 60 * 20 * sc.duration / 1800);
  const t0 = performance.now();
  try {
    for (let n = 0; n < frames; n++, S.i++) {
      if (sc.over) break;
      sc.update(0, 50);
      if (sc.choice) sc.pickChoice(sc.choice.event ? 0 : Math.floor(Math.random() * 3));
      const Z = sc.zone;
      let tx = null, ty = null;
      if (sc.outside) { tx = Z.cx; ty = Z.cy; }
      else if (sc.pois.length) { tx = sc.pois[0].x; ty = sc.pois[0].y; }
      else if (sc.battles.length && sc.battles[0].favor === null) { tx = sc.battles[0].x; ty = sc.battles[0].y; }
      else if (sc.sects.length && P.stones > 120) { tx = sc.sects[0].x; ty = sc.sects[0].y; }
      const k = sc.keys;
      k.D.isDown = k.A.isDown = k.W.isDown = k.S.isDown = false;
      if (tx !== null) {
        if (tx > P.x + 20) k.D.isDown = true; if (tx < P.x - 20) k.A.isDown = true;
        if (ty > P.y + 20) k.S.isDown = true; if (ty < P.y - 20) k.W.isDown = true;
      }
      if (sc.nearPoi && !sc.choice) sc.usePoi(sc.nearPoi);
      if (sc.nearPasserby && sc.nearPasserby.state === 'feud') sc.takeSide(sc.nearPasserby.battle, 0);
      if (sc.curSect && P.stones > 50) for (let j = 0; j < 3; j++) sc.buyShop(j);
      k.SPACE.isDown = !sc.outside && tx === null && P.stones > 200 && S.i % 100 < 50;
      for (const e of sc.enemies) {
        if (e.act) S.seen.acts[e.act.kind] = (S.seen.acts[e.act.kind] || 0) + 1;
        if (e.boss && !e._seen) { e._seen = 1; e._t = sc.gm; S.seen.bosses.push(`${e.type}@${sc.gm.toFixed(1)}`); }
      }
      if (sc.battles.length) S.seen.battles++;
      if (S.i % Math.round(20 * 60 * every * sc.duration / 1800) === 0) {
        const sec = every * 60 * sc.duration / 1800;
        S.log.push(`${sc.gm.toFixed(0)}分 Lv${P.level} ${['練氣', '築基', '金丹', '元嬰', '化神'][P.realm]} 妖${sc.enemies.length} 斬${P.kills} 石${Math.round(P.stones)} `
          + `神通[${P.skills.map(s => `${s.id}${s.lvl}/${s.g}品`).join(',')}] 寶${JSON.stringify(P.weapons)} 受傷dps${Math.round(S.win / sec)} 血${P.maxHp}+${P.maxShield} `
          + `王${sc.enemies.filter(e => e.boss).map(e => `${e.type}${Math.round(e.hp / e.maxHp * 100)}%`)}`);
        S.win = 0;
      }
    }
  } catch (e) { S.err = e.stack; }
  for (const key of ['D', 'A', 'W', 'S', 'SPACE']) sc.keys[key].isDown = false;
  return { ms: Math.round(performance.now() - t0), err: S.err, over: sc.over, reason: sc.endReason, log: S.log.splice(0) };
}

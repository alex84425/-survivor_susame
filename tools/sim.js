// 數值平衡用的自動模擬：在瀏覽器主控台執行
//   const sim = await import('/tools/sim.js'); await sim.ready(); sim.run(8)   // 跑 8 個遊戲分鐘
// 機器人會：瞄準最近的敵人連發神通、踩到預警圈就閃避、清低等級巢穴、靈石夠就回篝火升級、留在結界內。
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
  const S = window.SIM = { i: 0, dmg: 0, win: 0, log: [], err: null, seen: { killed: [], camps: 0, rests: 0 } };
  const P = sc.P;
  sc.damagePlayer = d => { if (P.inv > 0) return; S.dmg += d; S.win += d; };
  const kill = sc.killEnemy.bind(sc);
  sc.killEnemy = e => { if (e.boss) S.seen.killed.push(`${e.type}@${sc.gm.toFixed(1)}`); return kill(e); };
  // 機器人輸入：取代鍵盤滑鼠
  const origInput = sc.updateInput.bind(sc);
  sc.updateInput = dt => {
    origInput(dt);
    const tg = sc.nearestTarget(P.x, P.y, 480);
    if (tg) { sc.aim = Math.atan2(tg.y - P.y, tg.x - P.x); sc.aimPt = { x: tg.x, y: tg.y }; }
    sc.castInput = [!!tg, !!tg, !!tg, !!tg];
  };
  return 'ready';
}

export function run(minutes, every = 2) {
  const sc = scene(), S = window.SIM, P = sc.P, frames = Math.round(minutes * 60 * 20 * sc.duration / 1800);
  const t0 = performance.now();
  const k = sc.keys;
  try {
    for (let n = 0; n < frames; n++, S.i++) {
      if (sc.over) break;
      if (sc.choice) sc.pickChoice(0);
      // 決定目的地
      const Z = sc.zone;
      let goal = null;
      if (sc.outside) goal = { x: Z.cx, y: Z.cy };
      else if (P.stones >= sc.expNext() * 2 || P.hp < P.maxHp * 0.35) goal = sc.bonfires.filter(b => !Z || Math.hypot(b.x - Z.cx, b.y - Z.cy) < Z.R).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
      else {
        const c = sc.camps.filter(c => !c.cleared && c.tier <= 1 + Math.floor(sc.gm / 8) && (!Z || Math.hypot(c.x - Z.cx, c.y - Z.cy) < Z.R)).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
        goal = c || sc.enemies.find(e => e.boss) || null;
      }
      k.D.isDown = k.A.isDown = k.W.isDown = k.S.isDown = false;
      if (goal) {
        const dx = goal.x - P.x, dy = goal.y - P.y, d = Math.hypot(dx, dy);
        const stop = goal.lit !== undefined ? 30 : 230;
        if (d > stop) { if (dx > 20) k.D.isDown = true; if (dx < -20) k.A.isDown = true; if (dy > 20) k.S.isDown = true; if (dy < -20) k.W.isDown = true; }
        if (goal.lit !== undefined && d < 60) { sc.restAt(goal); S.seen.rests++; }
      }
      // 踩在預警圈內就閃避
      const danger = sc.areas.some(a => (a.kind === 'foeslam' || a.kind === 'foezone') && a.delay > 0 && a.delay < 0.25 && Math.hypot(a.x - P.x, a.y - P.y) < a.R + P.r);
      k.SPACE.isDown = danger;
      if (danger) k.SPACE._justDown = true;
      sc.update(0, 50);
      k.SPACE._justDown = false;
      if (S.i % Math.round(20 * 60 * every * sc.duration / 1800) === 0) {
        const sec = every * 60 * sc.duration / 1800;
        S.log.push(`${sc.gm.toFixed(0)}分 Lv${P.level} ${['練氣', '築基', '金丹', '元嬰', '化神'][P.realm]} 斬${P.kills} 石${Math.round(P.stones)} 清巢${sc.camps.filter(c => c.cleared).length} 篝火${sc.bonfires.filter(b => b.lit).length} `
          + `神通[${P.skills.map(s => `${s.id}${s.lvl}/${s.g}品`).join(',')}] 寶${JSON.stringify(P.weapons)} 受傷dps${Math.round(S.win / sec)} 血${P.maxHp}+${P.maxShield} `
          + `王${sc.enemies.filter(e => e.boss).map(e => `${e.type}${Math.round(e.hp / e.maxHp * 100)}%`)}`);
        S.win = 0;
      }
    }
  } catch (e) { S.err = e.stack; }
  for (const key of ['D', 'A', 'W', 'S', 'SPACE']) k[key].isDown = false;
  return { ms: Math.round(performance.now() - t0), err: S.err, over: sc.over, reason: sc.endReason, killed: S.seen.killed, log: S.log.splice(0) };
}

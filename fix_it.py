import re

with open("game.js", "r") as f:
    text = f.read()

# 1. SHIP_CLASSES constant
text = re.sub(
    r'const SHIP_CLASSES = \[.*?\];\nconst SHIP_Y = \[70, 530\], SHIP_W = 28, SHIP_H = 20, DASH_SPD = 900, SHIP_VERT = 50;\nconst AI_DIFF',
    'const SHIP_Y = [70, 530], SHIP_W = 28, SHIP_H = 20, DASH_SPD = 900, SHIP_VERT = 50;\nconst SHIP_SPD = 320, SHIP_VSPD = 200, DASH_DUR = 150, DASH_CD = 1200;\nconst AI_DIFF',
    text,
    flags=re.DOTALL
)

# Fix missing constants
text = re.sub(
    r'const BULL_LIFE = 5000, MAX_BULLS = 4;\nconst GRAV_BASE = 900',
    'const BULL_LIFE = 5000, MAX_BULLS = 4, BULL_SPD = 340, BULL_RAD = 5, SHOOT_CD = 280;\nconst GRAV_BASE = 900',
    text
)

# 2. remove shipClasses array
text = text.replace('    shipClasses: [0, 0],\n', '')

# 3. mkShip
text = re.sub(
    r'function mkShip\(idx\) \{\n  const cls = SHIP_CLASSES\[s\.g\.shipClasses\[idx\]\];\n  return \{ x: W / 2, y: SHIP_Y\[idx\], baseY: SHIP_Y\[idx\], vx: 0, dashCd: 0, dashEnd: 0, invuln: 0, alive: true, pu: null, puEnd: 0, cls \};\n\}',
    'function mkShip(idx) {\n  return { x: W / 2, y: SHIP_Y[idx], baseY: SHIP_Y[idx], vx: 0, dashCd: 0, dashEnd: 0, invuln: 0, alive: true, pu: null, puEnd: 0 };\n}',
    text
)

# 4. updatePlaying dash logic
text = text.replace('const dashDur = ship.pu === \'WARP\' ? ship.cls.dashD * 1.5 : ship.cls.dashD;', 'const dashDur = ship.pu === \'WARP\' ? DASH_DUR * 1.5 : DASH_DUR;')
text = text.replace('ship.dashCd = time + (rubberBand(g, i) ? ship.cls.dashC * 0.8 : ship.cls.dashC);', 'ship.dashCd = time + (rubberBand(g, i) ? DASH_CD * 0.8 : DASH_CD);')
text = text.replace('const spd = isDashing ? DASH_SPD : ship.cls.spd;', 'const spd = isDashing ? DASH_SPD : SHIP_SPD;')
text = text.replace('ship.y = Phaser.Math.Clamp(ship.y + vdir * ship.cls.vspd * dt, ship.baseY - 10, ship.baseY + SHIP_VERT * fwd);', 'ship.y = Phaser.Math.Clamp(ship.y + vdir * SHIP_VSPD * dt, ship.baseY - 10, ship.baseY + SHIP_VERT * fwd);')

# 5. updatePlaying shoot logic
text = text.replace('shoot(s, i, time); g.shootCd[i] = time + ship.cls.bCd;', 'shoot(s, i, time); g.shootCd[i] = time + SHOOT_CD;')

# 6. shoot function
text = text.replace('const vy = idx === 0 ? ship.cls.bSpd : -ship.cls.bSpd;', 'const vy = idx === 0 ? BULL_SPD : -BULL_SPD;')
text = text.replace('g.bullets.push(mkBullet(ship.x, ship.y, Math.sin(a) * ship.cls.bSpd * 0.5, vy * Math.cos(a), idx, null, ship.cls.bRad));', 'g.bullets.push(mkBullet(ship.x, ship.y, Math.sin(a) * BULL_SPD * 0.5, vy * Math.cos(a), idx, null, BULL_RAD));')
text = text.replace('g.bullets.push(mkBullet(ship.x, ship.y, 0, vy, idx, null, ship.cls.bRad));', 'g.bullets.push(mkBullet(ship.x, ship.y, 0, vy, idx, null, BULL_RAD));')
text = text.replace('g.bullets.push(mkBullet(ship.x, ship.y, 0, vy, idx, \'HOMING\', ship.cls.bRad));', 'g.bullets.push(mkBullet(ship.x, ship.y, 0, vy, idx, \'HOMING\', BULL_RAD));')

# 7. aiWantShoot
text = text.replace('const vy = idx === 0 ? ship.cls.bSpd : -ship.cls.bSpd;\n  const pts = simTrajectory', 'const vy = idx === 0 ? BULL_SPD : -BULL_SPD;\n  const pts = simTrajectory')

# 8. Menu labels
text = text.replace(
    "const labels = ['1 PLAYER', '2 PLAYERS', 'P1: BALANCED', 'P2: BALANCED', 'CONTROLS', 'SCORES'];\n  for (let i = 0; i < 6; i++) {",
    "const labels = ['1 PLAYER', '2 PLAYERS', 'CONTROLS', 'SCORES'];\n  for (let i = 0; i < 4; i++) {"
)

# 9. updateTitle wrapping
text = text.replace(
    "if (axis !== 0 && time > g.menu.cd) {\n    g.menu.cur = Phaser.Math.Wrap(g.menu.cur + axis, 0, 6);\n",
    "if (axis !== 0 && time > g.menu.cd) {\n    g.menu.cur = Phaser.Math.Wrap(g.menu.cur + axis, 0, 4);\n"
)
text = text.replace(
    "if (axis !== 0 && time > g.menu.cd) {\n    g.menu.cur = Phaser.Math.Wrap(g.menu.cur + axis, 0, 4);\n",
    "if (axis !== 0 && time > g.menu.cd) {\n    g.menu.cur = Phaser.Math.Wrap(g.menu.cur + axis, 0, 4);\n"
) # Just ensuring 0,4 wrap

with open("game.js", "w") as f:
    f.write(text)


import fs from "node:fs/promises";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  tickGame,
  setInput,
} from "../server/simulation";
import { ROLES, EMPTY_INPUT } from "../shared/content";
import { survivalCurve } from "../shared/survival";
import type { Role } from "../shared/types";
import { prepareFixture, startFixture } from "../tests/support";
const cases = [];
for (const players of [1, 4])
  for (const roll of [0.5, 0.9])
    for (const role of Object.keys(ROLES) as Role[]) {
      const g = createGame("BAL41", "h", 41);
      g.state.mode = "survival";
      addPlayer(g, "h", "测试", role);
      for (let i = 1; i < players; i++) addPlayer(g, "p" + i, "队友", "medic");
      prepareFixture(g);
      startFixture(g, "h");
      const p = g.state.players[0];
      g.state.officeProps = [];
      g.state.objects = [];
      g.state.enemies = [];
      g.state.eventCd = 999;
      g.state.spawnCd = 0;
      g.random = () => roll;
      tickGame(g, 1 / 60);
      const e = g.state.enemies[0];
      g.state.enemies = [e];
      g.state.spawnCd = 999;
      e.x = p.x + 52;
      e.y = p.y;
      e.speed = 0;
      e.cd = 999;
      p.arsenal = {};
      p.attackCooldowns = {};
      p.crit = 0;
      p.invulnerable = 999;
      setInput(g, p.id, { ...EMPTY_INPUT, fire: true });
      let frames = 0;
      while (e.hp > 0 && frames < 300) {
        tickGame(g, 1 / 60);
        frames++;
      }
      const row = {
        players,
        role,
        enemy: e.kind,
        hp: e.maxHp,
        ordinaryOnlySeconds: +(frames / 60).toFixed(3),
        killed: e.hp <= 0,
      };
      assert.equal(row.killed, true, JSON.stringify(row));
      assert.ok(frames < 240, JSON.stringify(row));
      cases.push(row);
    }
const report = {
  version: "4.1.0",
  fixture:
    "Server-authoritative 60Hz simulation; first-wave actual director spawn repositioned52px forward; stationary target, ordinary attack only, no random modules, Q or critical hits; other squad members do not attack. This measures in-range damage, not travel/chase time or human survival.",
  cases,
  pressure: [1, 2, 3, 4, 5, 6, 10, 15, 20, 30].map((wave) => ({
    wave,
    solo: survivalCurve(wave, 1),
    fourPlayers: survivalCurve(wave, 4),
  })),
};
await fs.writeFile(
  "docs/balance-4.1.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      cases: cases.length,
      maxOrdinarySeconds: Math.max(...cases.map((c) => c.ordinaryOnlySeconds)),
      soloHP: [
        ...new Set(cases.filter((c) => c.players === 1).map((c) => c.hp)),
      ],
      fourPlayerHP: [
        ...new Set(cases.filter((c) => c.players === 4).map((c) => c.hp)),
      ],
    },
    null,
    2,
  ),
);

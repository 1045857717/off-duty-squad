import test from "node:test";
import assert from "node:assert/strict";
import { SnapshotCadence } from "../server/snapshotCadence";
const light = {
  phase: "playing",
  enemies: [],
  bullets: [],
  effects: [],
} as const;
const heavy = { ...light, enemies: Array(100) };

test("light play keeps 30Hz state, dense play budgets 20Hz without reducing simulation ticks", () => {
  const normal = new SnapshotCadence(),
    dense = new SnapshotCadence();
  let a = 0,
    b = 0;
  for (let frame = 0; frame < 600; frame++) {
    a += Number(normal.due(frame, light));
    b += Number(dense.due(frame, heavy));
  }
  assert.equal(a, 300);
  assert.equal(b, 200);
});
test("hysteresis prevents threshold flapping, recovery returns to 30Hz, lobby bypasses slowdown", () => {
  const cadence = new SnapshotCadence();
  const sent: number[] = [];
  for (let frame = 0; frame < 600; frame++) {
    const state = frame < 120 && frame % 2 === 0 ? heavy : light;
    if (cadence.due(frame, state)) sent.push(frame);
  }
  const during = sent.filter((f) => f < 290);
  assert.ok(during.slice(1).every((f, i) => f - during[i] === 3));
  const recovered = sent.filter((f) => f > 310);
  assert.ok(recovered.slice(1).every((f, i) => f - recovered[i] === 2));
  const lobby = new SnapshotCadence();
  lobby.due(0, heavy);
  assert.equal(lobby.due(2, { ...heavy, phase: "lobby" }), true);
});
test("switching budgets never creates an 83ms modulo gap", () => {
  const cadence = new SnapshotCadence();
  let last = 0;
  for (let frame = 0; frame < 600; frame++)
    if (cadence.due(frame, frame % 17 < 9 ? heavy : light)) {
      assert.ok(frame - last <= 3);
      last = frame;
    }
});

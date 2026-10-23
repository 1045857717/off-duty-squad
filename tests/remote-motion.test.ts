import { test } from "node:test";
import assert from "node:assert/strict";
import { inViewport, RemoteMotion, RemoteClock } from "../src/remoteMotion";

test("viewport guard includes edge overlap and excludes distant/invalid entities", () => {
  const view = { x: 100, y: 100, width: 600, height: 400 };
  assert.equal(inViewport({ x: 80, y: 100 }, view, 30), true);
  assert.equal(inViewport({ x: 730, y: 530 }, view, 30), true);
  assert.equal(inViewport({ x: 731, y: 100 }, view, 30), false);
  assert.equal(inViewport({ x: NaN, y: 100 }, view, 30), false);
});

test("remote snapshots interpolate between packets independently of display refresh", () => {
  const track = new RemoteMotion();
  track.push({ x: 0, y: 0 }, 0);
  track.push({ x: 10, y: 20 }, 0.1);
  assert.deepEqual(track.sample(0.05), { x: 5, y: 10 });
  assert.ok(Math.abs(track.sample(0.075).x - 7.5) < 1e-6);
  assert.ok(Math.abs(track.sample(0.075).y - 15) < 1e-6);
  assert.deepEqual(track.sample(-1), { x: 0, y: 0 });
});

test("jitter and silence never cause unlimited remote extrapolation or backwards rewind", () => {
  const track = new RemoteMotion();
  track.push({ x: 0, y: 0 }, 1);
  track.push({ x: 4, y: 0 }, 1.04);
  track.push({ x: 13, y: 0 }, 1.13);
  assert.ok(Math.abs(track.sample(1.08).x - 8) < 1e-6);
  assert.ok(Math.abs(track.sample(2).x - 13) < 1e-6);
  track.push({ x: -99, y: 0 }, 1.01);
  assert.ok(Math.abs(track.sample(2).x - 13) < 1e-6);
  track.push({ x: 13, y: 0 }, 1.13); // duplicate UI/chat state isn't a new motion sample
  assert.ok(Math.abs(track.sample(2).x - 13) < 1e-6);
});

test("teleports, long gaps and explicit world reset do not glide through walls", () => {
  const track = new RemoteMotion();
  track.push({ x: 5, y: 6 }, 1);
  track.push({ x: 500, y: 600 }, 1.03);
  assert.deepEqual(track.sample(1.01), { x: 500, y: 600 });
  track.push({ x: 510, y: 610 }, 3);
  assert.deepEqual(track.sample(3.5), { x: 510, y: 610 });
  track.clear();
  track.push({ x: 1, y: 2 }, 0);
  assert.deepEqual(track.sample(0), { x: 1, y: 2 });
});

test("motion sample history is bounded during long matches", () => {
  const track = new RemoteMotion();
  for (let i = 0; i < 10000; i++) track.push({ x: i, y: i }, i / 30);
  assert.ok(track.size <= 6);
  assert.equal(track.sample(9999 / 30).x, 9999);
});

test("late arrival cannot rewind the remote playout clock and a new match resets it", () => {
  const clock = new RemoteClock();
  const a = clock.advance(10, 0.075);
  assert.equal(clock.advance(10.033, 0), a);
  assert.ok(clock.advance(10.066, 0.02) > a);
  assert.ok(clock.advance(0, 0) < 1);
  clock.reset();
  assert.equal(clock.advance(1, 0), 0.95);
});

test("buffer exhaustion holds outside a wall and forward late packets never yank backwards", () => {
  const track = new RemoteMotion(),
    clock = new RemoteClock();
  track.push({ x: 0, y: 0 }, 10);
  track.push({ x: 3.3, y: 0 }, 10.033);
  const before = track.sample(clock.advance(10.033, 0.075));
  track.push({ x: 4, y: 0 }, 10.066);
  const after = track.sample(clock.advance(10.066, 0));
  assert.equal(before.x, 3.3);
  assert.ok(after.x >= before.x);
  const wall = new RemoteMotion();
  wall.push({ x: 220, y: 100 }, 1);
  wall.push({ x: 226, y: 100 }, 1.033);
  assert.equal(wall.sample(2).x, 226);
});

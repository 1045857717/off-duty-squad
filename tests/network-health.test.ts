import test from "node:test";
import assert from "node:assert/strict";
import {
  NetworkHealth,
  NETWORK_PROBE_TIMEOUT_MS,
  NETWORK_STALE_MS,
} from "../src/networkHealth";

function fixture() {
  let now = 1000;
  const health = new NetworkHealth(() => now);
  const advance = (ms: number) => {
    now += ms;
  };
  const reply = (ms: number) => {
    const probe = health.beginProbe();
    assert.notEqual(probe, null);
    advance(ms);
    health.finishProbe(probe!, false);
  };
  return { health, advance, reply };
}

test("an unmeasured or disconnected connection never invents a zero RTT", () => {
  const { health } = fixture();
  assert.deepEqual(health.read(), { status: "disconnected", rttMs: null });
  assert.equal(health.beginProbe(), null);
  health.setConnected(true);
  assert.deepEqual(health.read(), { status: "unknown", rttMs: null });
});

test("RTT uses the probe round trip and explicit quality boundaries", () => {
  const { health, reply } = fixture();
  health.setConnected(true);
  for (const [elapsed, status, rttMs] of [
    [0, "good", 1],
    [42.4, "good", 42],
    [100, "good", 100],
    [101, "moderate", 101],
    [200, "moderate", 200],
    [201, "poor", 201],
  ] as const) {
    reply(elapsed);
    assert.deepEqual(health.read(), { status, rttMs });
  }
});

test("a timeout removes the last green sample and a fresh reply recovers", () => {
  const { health, reply, advance } = fixture();
  health.setConnected(true);
  reply(25);
  const probe = health.beginProbe()!;
  advance(NETWORK_PROBE_TIMEOUT_MS);
  health.finishProbe(probe, true);
  assert.deepEqual(health.read(), { status: "no-response", rttMs: null });
  assert.notEqual(health.beginProbe(), null);
  assert.equal(
    health.read().status,
    "no-response",
    "starting a retry is not recovery",
  );
  health.reset();
  reply(175);
  assert.deepEqual(health.read(), { status: "moderate", rttMs: 175 });
});

test("a pending retry recovers no-response only after its acknowledgement", () => {
  const { health, advance } = fixture();
  health.setConnected(true);
  health.finishProbe(health.beginProbe()!, true);
  const retry = health.beginProbe()!;
  assert.equal(health.read().status, "no-response");
  advance(40);
  health.finishProbe(retry, false);
  assert.deepEqual(health.read(), { status: "good", rttMs: 40 });
});

test("age alone expires a success even when the socket still reports connected", () => {
  const { health, reply, advance } = fixture();
  health.setConnected(true);
  reply(30);
  advance(NETWORK_STALE_MS - 1);
  assert.equal(health.read().status, "good");
  advance(1);
  assert.deepEqual(health.read(), { status: "no-response", rttMs: null });
});

test("a missing first reply and delayed timeout callback cannot stay unknown or green", () => {
  const { health, advance } = fixture();
  health.setConnected(true);
  const probe = health.beginProbe()!;
  advance(NETWORK_PROBE_TIMEOUT_MS);
  assert.deepEqual(health.read(), { status: "no-response", rttMs: null });
  health.finishProbe(probe, false);
  assert.deepEqual(health.read(), { status: "no-response", rttMs: null });
});

test("a connected client with no probes eventually reports no response", () => {
  const { health, advance } = fixture();
  health.setConnected(true);
  advance(NETWORK_STALE_MS);
  assert.deepEqual(health.read(), { status: "no-response", rttMs: null });
});

test("disconnect clears success and rejects an acknowledgement from the old connection", () => {
  const { health, reply, advance } = fixture();
  health.setConnected(true);
  reply(20);
  const old = health.beginProbe()!;
  health.setConnected(false);
  advance(20);
  health.finishProbe(old, false);
  assert.deepEqual(health.read(), { status: "disconnected", rttMs: null });
  health.setConnected(true);
  health.finishProbe(old, false);
  assert.deepEqual(health.read(), { status: "unknown", rttMs: null });
  reply(60);
  assert.deepEqual(health.read(), { status: "good", rttMs: 60 });
});

test("hiding or handing off clears RTT and ignores the pending probe after reclaim", () => {
  const { health, reply, advance } = fixture();
  health.setConnected(true);
  reply(20);
  const beforeHandoff = health.beginProbe()!;
  health.reset();
  const afterReclaim = health.beginProbe()!;
  advance(90);
  health.finishProbe(beforeHandoff, true);
  assert.equal(health.read().status, "unknown");
  health.finishProbe(afterReclaim, false);
  assert.deepEqual(health.read(), { status: "good", rttMs: 90 });
  health.finishProbe(beforeHandoff, false);
  assert.deepEqual(health.read(), { status: "good", rttMs: 90 });
});

test("only one probe may be in flight and duplicate replies cannot replace a sample", () => {
  const { health, advance } = fixture();
  health.setConnected(true);
  const probe = health.beginProbe()!;
  assert.equal(health.beginProbe(), null);
  advance(50);
  health.finishProbe(probe, false);
  advance(500);
  health.finishProbe(probe, true);
  assert.deepEqual(health.read(), { status: "good", rttMs: 50 });
});

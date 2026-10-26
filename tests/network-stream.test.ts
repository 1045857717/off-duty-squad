import test from "node:test";
import assert from "node:assert/strict";
import { NetworkStream } from "../src/networkStream";
function fixture() {
  let now = 1000;
  const stream = new NetworkStream(() => now);
  return { stream, advance: (ms: number) => (now += ms) };
}
test("incoming state health is independent from RTT and labels its measured rate", () => {
  const { stream, advance } = fixture();
  assert.equal(stream.read().status, "disconnected");
  stream.setConnected(true);
  stream.setTransport("websocket");
  assert.equal(stream.read().status, "unmeasured");
  stream.recordSnapshot();
  for (let i = 0; i < 10; i++) {
    advance(50);
    stream.recordSnapshot();
  }
  const reading = stream.read();
  assert.equal(reading.status, "fresh");
  assert.equal(reading.snapshotHz, 20);
  assert.equal(reading.jitterMs, 0);
  assert.equal(reading.transport, "websocket");
  advance(300);
  assert.equal(stream.read().status, "late");
  advance(701);
  assert.equal(stream.read().status, "stalled");
});
test("jitter is an arrival statistic, not fabricated packet loss", () => {
  const { stream, advance } = fixture();
  stream.setConnected(true);
  stream.recordSnapshot();
  for (const gap of [30, 70, 40, 60]) {
    advance(gap);
    stream.recordSnapshot();
  }
  const reading = stream.read();
  assert.equal(reading.snapshotHz, 20);
  assert.equal(reading.jitterMs, 15);
  assert.equal(reading.maxGapMs, 70);
});
test("visibility or room reset discards stale state rates and reconnection resets transport", () => {
  const { stream, advance } = fixture();
  stream.setConnected(true);
  stream.setTransport("polling");
  stream.recordSnapshot();
  advance(50);
  stream.recordSnapshot();
  stream.reset();
  assert.equal(stream.read().status, "unmeasured");
  assert.equal(stream.read().transport, "polling");
  stream.setConnected(false);
  assert.equal(stream.read().status, "disconnected");
  assert.equal(stream.read().transport, "unknown");
  stream.setConnected(true);
  assert.equal(stream.read().snapshotHz, null);
});
test("history stays bounded and a long silence cannot poison the new stream rate", () => {
  const { stream, advance } = fixture();
  stream.setConnected(true);
  stream.recordSnapshot();
  for (let i = 0; i < 10000; i++) {
    advance(50);
    stream.recordSnapshot();
  }
  assert.ok(stream.sampleCount <= 32);
  advance(2000);
  stream.recordSnapshot();
  assert.equal(stream.read().snapshotHz, null);
  for (let i = 0; i < 5; i++) {
    advance(50);
    stream.recordSnapshot();
  }
  assert.equal(stream.read().snapshotHz, 20);
});

test("active room reset has a first-state deadline, while idle lobby stays unmeasured", () => {
  const { stream, advance } = fixture();
  stream.setConnected(true);
  advance(12000);
  assert.equal(stream.read().status, "unmeasured");
  stream.expectState(true);
  advance(999);
  assert.equal(stream.read().status, "unmeasured");
  advance(1);
  assert.equal(stream.read().status, "stalled");
  stream.recordSnapshot();
  assert.equal(stream.read().status, "fresh");
  stream.reset();
  advance(12000);
  assert.equal(stream.read().status, "stalled");
  stream.expectState(false);
  advance(12000);
  assert.equal(stream.read().status, "unmeasured");
});

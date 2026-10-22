/**
 * Run: node tests/art40-rig-audit.mjs
 * Starts an isolated Vite server and Chromium; no game backend is required.
 * Saves the actual six-view and WebGL motion sheets under test-results/art40-rig-audit/,
 * plus its report.json with the measured results of this run.
 * PLAYWRIGHT_BROWSER can select an existing Chromium executable, like the other browser probes.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "test-results/art40-rig-audit");
const reportPath = path.join(output, "report.json");
const errors = [];
const report = {
  command: "node tests/art40-rig-audit.mjs",
  status: "running",
  coverage:
    "Isolated real Canvas atlas and WebGL enemy rigs; not the full game direction test.",
};
let vite, browser;
try {
  await fs.mkdir(output, { recursive: true });
  vite = await createServer({
    root,
    logLevel: "error",
    clearScreen: false,
    server: { host: "127.0.0.1", port: 0, open: false, hmr: false },
  });
  await vite.listen();
  const address = vite.httpServer.address();
  assert.ok(address && typeof address !== "string");
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_BROWSER
      ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1540, height: 1240 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/__art40-rig-audit", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><link rel="icon" href="data:,"></head><body style="margin:0;background:#282532"><canvas id="sheet"></canvas></body></html>',
    }),
  );
  await page.goto("http://127.0.0.1:" + address.port + "/__art40-rig-audit");
  report.browser = browser.version();
  report.frames = await page.evaluate(async () => {
    const rig = await import("/src/game/zombieRig.ts");
    const joints = await import("/src/game/joints.ts");
    const kinds = Object.keys(rig.ZOMBIE_DESIGNS);
    const frames = {},
      violations = [];
    const metrics = {
      count: 0,
      views: 6,
      bonesPerKind: rig.ZOMBIE_PARTS.length,
      maxWidth: 0,
      maxHeight: 0,
      dimensionMismatches: [],
      empty: [],
      outsideCrop: [],
      disconnected: [],
      violations,
    };
    for (const kind of kinds) {
      for (let column = 0; column < 6; column++) {
        frames[kind + "-" + column] = rig.ZOMBIE_PARTS.map((part) => {
          const g = rig.zombieGeometry(column, part.name, kind);
          const [rx, ry, rw, rh] = g.rect;
          const temp = document.createElement("canvas");
          temp.width = Math.max(2, Math.ceil(rw * 126));
          temp.height = Math.max(2, Math.ceil(rh * 157.5));
          const context = temp.getContext("2d");
          context.translate(-rx * 126, -ry * 157.5);
          rig.paintZombiePart(context, kind, column, part.name, g);
          const id = kind + "-" + column + "-" + part.name;
          metrics.count++;
          metrics.maxWidth = Math.max(metrics.maxWidth, temp.width);
          metrics.maxHeight = Math.max(metrics.maxHeight, temp.height);
          if (temp.width > 96 || temp.height > 112)
            violations.push(id + " exceeds 96x112 cell");
          if (rig.zombieGeometry(column, part.name, kind) !== g)
            violations.push(id + " is not cached");
          const pixels = context.getImageData(
            0,
            0,
            temp.width,
            temp.height,
          ).data;
          let covered = 0;
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) covered++;
          if (!covered) metrics.empty.push(id);
          // Paint again with an eight-pixel halo. This detects actual paint outside
          // the crop, including details which a cropped image would hide completely.
          const pad = 8,
            probe = document.createElement("canvas");
          probe.width = temp.width + pad * 2;
          probe.height = temp.height + pad * 2;
          const extra = probe.getContext("2d");
          extra.translate(pad - rx * 126, pad - ry * 157.5);
          rig.paintZombiePart(extra, kind, column, part.name, g);
          const expanded = extra.getImageData(
            0,
            0,
            probe.width,
            probe.height,
          ).data;
          let outside = 0;
          for (let y = 0; y < probe.height; y++)
            for (let x = 0; x < probe.width; x++) {
              if (
                x >= pad &&
                x < pad + temp.width &&
                y >= pad &&
                y < pad + temp.height
              )
                continue;
              if (expanded[(y * probe.width + x) * 4 + 3] >= 16) outside++;
            }
          if (outside) metrics.outsideCrop.push({ part: id, pixels: outside });
          if (part.parent !== "root") {
            const parent = rig.zombieGeometry(column, part.parent, kind);
            if (
              parent.tip &&
              Math.hypot(
                parent.tip[0] - g.pivot[0],
                parent.tip[1] - g.pivot[1],
              ) > 1e-6
            )
              metrics.disconnected.push(id);
          }
          return { g, temp };
        });
      }
      for (let i = 0; i < rig.ZOMBIE_PARTS.length; i++) {
        const sizes = new Set(
          Array.from({ length: 6 }, (_, column) => {
            const temp = frames[kind + "-" + column][i].temp;
            return temp.width + "x" + temp.height;
          }),
        );
        if (sizes.size !== 1)
          metrics.dimensionMismatches.push(
            kind + "-" + rig.ZOMBIE_PARTS[i].name,
          );
      }
    }
    // Same parent-first flattening order and quad-origin math as ArticulatedActor.
    // This first sheet isolates atlas coverage from the live WebGL check below.
    const order = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14];
    const draw = (context, kind, column, pose, x, y) => {
      const parts = frames[kind + "-" + column],
        matrices = [];
      for (const index of order) {
        const part = rig.ZOMBIE_PARTS[index],
          g = parts[index].g;
        const parent =
          part.parent === "root"
            ? -1
            : rig.ZOMBIE_PARTS.findIndex((p) => p.name === part.parent);
        const pp = parent < 0 ? null : parts[parent].g.pivot;
        const a = Math.cos(pose[part.name]),
          b = Math.sin(pose[part.name]);
        const sy = part.name === "torso" ? pose.breath : 1,
          c = -b * sy,
          d = a * sy;
        const tx = pp ? (g.pivot[0] - pp[0]) * 84 : -42 + g.pivot[0] * 84;
        const ty = pp ? (g.pivot[1] - pp[1]) * 105 : -53 + g.pivot[1] * 105;
        if (parent < 0) matrices[index] = [a, b, c, d, tx, ty];
        else {
          const p = matrices[parent];
          matrices[index] = [
            p[0] * a + p[2] * b,
            p[1] * a + p[3] * b,
            p[0] * c + p[2] * d,
            p[1] * c + p[3] * d,
            p[0] * tx + p[2] * ty + p[4],
            p[1] * tx + p[3] * ty + p[5],
          ];
        }
      }
      context.save();
      context.translate(x, y + pose.bob * 1.32);
      context.scale(1.32, 1.32);
      for (let i = 0; i < parts.length; i++) {
        const { g, temp } = parts[i];
        context.save();
        context.transform(...matrices[i]);
        context.drawImage(
          temp,
          (g.rect[0] - g.pivot[0]) * 84,
          (g.rect[1] - g.pivot[1]) * 105,
          g.rect[2] * 84,
          g.rect[3] * 105,
        );
        context.restore();
      }
      context.restore();
    };
    const sheet = document.getElementById("sheet");
    sheet.width = 1540;
    sheet.height = 1240;
    const context = sheet.getContext("2d");
    context.fillStyle = "#282532";
    context.fillRect(0, 0, 1540, 1240);
    context.fillStyle = "#e8d9b5";
    context.font = "bold 22px sans-serif";
    context.fillText(
      "NIGHT OFFICE ODDITIES — six-view atlas / bone transforms",
      25,
      30,
    );
    kinds.forEach((kind, i) => {
      context.font = "bold 15px sans-serif";
      context.fillText(kind.toUpperCase(), i * 218 + 25, 65);
    });
    for (let column = 0; column < 6; column++) {
      const y = column * 188 + 80;
      context.fillStyle = column % 2 ? "#979990" : "#a4a399";
      context.fillRect(10, y, 1520, 178);
      context.fillStyle = "#282532";
      context.font = "12px sans-serif";
      context.fillText("VIEW " + column, 20, y + 20);
      kinds.forEach((kind, i) =>
        draw(
          context,
          kind,
          column,
          rig.zombiePose(
            kind,
            0.7,
            0.65,
            1250,
            joints.enemyAttackFrame("slash", 0, -1),
          ),
          i * 218 + 120,
          y + 92,
        ),
      );
    }
    window.officeArtAudit = { rig, joints, kinds };
    return metrics;
  });
  await page.screenshot({
    path: path.join(output, "six-views.png"),
    fullPage: true,
  });
  report.runtime = await page.evaluate(async () => {
    const { rig, joints, kinds } = window.officeArtAudit;
    const actorSource = await (
      await fetch("/src/game/ArticulatedActor.ts")
    ).text();
    const phaserUrl = actorSource.match(/from "([^"]*phaser[^"]*)"/)[1];
    const { default: interop } = await import(phaserUrl);
    const Phaser = interop.__esModule ? interop.default : interop;
    const { ArticulatedActor } = await import("/src/game/ArticulatedActor.ts");
    const { ENEMY_DEFS } = await import("/shared/combatProfiles.ts");
    const { ensureRigAtlas } = await import("/src/game/RigAtlas.ts");
    document.getElementById("sheet").style.display = "none";
    const host = document.createElement("div");
    document.body.appendChild(host);
    return await new Promise((resolve, reject) => {
      const game = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: host,
        width: 1540,
        height: 1240,
        backgroundColor: "#282532",
        banner: false,
        audio: { noAudio: true },
        render: { antialias: true },
        scene: {
          create() {
            try {
              const rigs = [],
                metrics = {
                  actors: 0,
                  renderer: "WebGL",
                  atlas: {},
                  invalid: [],
                  continuityFailures: [],
                };
              this.add.text(
                25,
                10,
                "NIGHT OFFICE ODDITIES — actual WebGL renderer",
                { fontSize: "22px", color: "#e8d9b5" },
              );
              kinds.forEach((kind, i) =>
                this.add.text(i * 218 + 25, 47, kind.toUpperCase(), {
                  fontSize: "15px",
                  color: "#e8d9b5",
                }),
              );
              const states = [
                "IDLE",
                "LOCOMOTION",
                "WINDUP",
                "CONTACT",
                "RECOVERY",
                "COLLAPSE",
              ];
              for (let row = 0; row < states.length; row++) {
                const y = row * 188 + 80;
                this.add.rectangle(
                  770,
                  y + 89,
                  1520,
                  178,
                  row % 2 ? 0x979990 : 0xa4a399,
                );
                this.add.text(20, y + 5, states[row], {
                  fontSize: "12px",
                  color: "#282532",
                });
                for (let i = 0; i < kinds.length; i++) {
                  const kind = kinds[i],
                    def = ENEMY_DEFS[kind];
                  const actor = new ArticulatedActor(
                    this,
                    def.role,
                    "audit-" + row + "-" + kind,
                    kind,
                  )
                    .setPosition(i * 218 + 120, y + 92)
                    .setScale(1.32);
                  actor.phase = 0.7;
                  actor.weight = row === 1 ? 0.8 : 0;
                  actor.updateEnemy(
                    {
                      kind,
                      hitFlash: 0,
                      windup: row === 2 ? def.windup * 0.04 : 0,
                      windupTotal: def.windup,
                      attackStartedAt:
                        row === 3 ? 9.85 : row === 4 ? 9.61 : -999,
                    },
                    Math.PI / 2,
                    row === 1 ? 2 : 0,
                    16,
                    1250,
                    10,
                  );
                  if (row === 5) actor.fall(400, 0);
                  rigs.push(actor);
                }
              }
              const atlas = this.textures.get(ensureRigAtlas(this)),
                image = atlas.getSourceImage();
              metrics.atlas = {
                key: atlas.key,
                width: image.width,
                height: image.height,
              };
              metrics.actors = rigs.length;
              metrics.renderer =
                game.renderer.type === Phaser.WEBGL ? "WebGL" : "other";
              for (const actor of rigs) {
                if (
                  actor.pose.renderPath !== "joint-quad-batch" ||
                  actor.pose.parts !== 15
                )
                  metrics.invalid.push(actor.name + " changed render path");
                for (const layer of actor.layers)
                  for (const bone of layer.bones)
                    if (!Array.from(bone.matrix).every(Number.isFinite))
                      metrics.invalid.push(actor.name + " nonfinite matrix");
              }
              // Sample phase boundaries and the windup-to-contact handoff on the actual pose curves.
              for (const kind of kinds) {
                const compare = (a, b, boundary) => {
                  for (const part of rig.ZOMBIE_PARTS)
                    if (Math.abs(a[part.name] - b[part.name]) > 0.005)
                      metrics.continuityFailures.push(
                        kind + " " + part.name + " " + boundary,
                      );
                };
                for (const age of [0, 0.12, 0.2, 0.34, 0.4, 0.58])
                  compare(
                    rig.zombiePose(
                      kind,
                      0.7,
                      0.8,
                      1250,
                      joints.enemyAttackFrame(
                        "overhead",
                        0,
                        Math.max(0, age - 1e-6),
                      ),
                    ),
                    rig.zombiePose(
                      kind,
                      0.7,
                      0.8,
                      1250,
                      joints.enemyAttackFrame("overhead", 0, age + 1e-6),
                    ),
                    age,
                  );
                compare(
                  rig.zombiePose(
                    kind,
                    0.7,
                    0.8,
                    1250,
                    joints.enemyAttackFrame("overhead", 1, -1),
                  ),
                  rig.zombiePose(
                    kind,
                    0.7,
                    0.8,
                    1250,
                    joints.enemyAttackFrame("overhead", 0, 0),
                  ),
                  "windup-release",
                );
              }
              window.officeArtRuntime = { rigs, ENEMY_DEFS, metrics, game };
              game.events.once("postrender", () => resolve(metrics));
            } catch (error) {
              reject(error);
            }
          },
        },
      });
    });
  });
  await page.screenshot({
    path: path.join(output, "webgl-motion.png"),
    fullPage: true,
  });
  report.matrices = await page.evaluate(() => {
    const { rigs, ENEMY_DEFS } = window.officeArtRuntime;
    const { kinds } = window.officeArtAudit;
    const metrics = {
      directionSamples: 0,
      deathSamples: 0,
      idleSamples: 0,
      failures: [],
      relaxedIdle: {},
    };
    const snapshot = (actor) =>
      JSON.stringify({
        rotation: actor.rotation,
        alpha: actor.alpha,
        layers: actor.layers.map((layer) => [
          layer.group.y,
          layer.group.scaleY,
          layer.bones.map((b) => [b.rotation, ...b.matrix]),
        ]),
      });
    const finite = (actor, stage) => {
      for (const layer of actor.layers)
        for (const bone of layer.bones)
          if (!Array.from(bone.matrix).every(Number.isFinite))
            metrics.failures.push(actor.enemyKind + " " + stage);
    };
    for (const actor of rigs.slice(0, kinds.length)) {
      const kind = actor.enemyKind,
        def = ENEMY_DEFS[kind];
      const enemy = {
        kind,
        hitFlash: 0,
        windup: 0,
        windupTotal: def.windup,
        attackStartedAt: -999,
      };
      if (["boss", "shooter", "bomber"].includes(kind)) {
        let maxHandFlare = 0,
          minHandDrop = Infinity,
          minForearmDrop = Infinity;
        actor.weight = 0;
        for (let frame = 0; frame < 144; frame++) {
          actor.updateEnemy(
            enemy,
            Math.PI / 2,
            0,
            16,
            3000 + frame * (1000 / 60),
            10,
          );
          const layer = actor.layers.find(
            (layer) => layer.group.visible && layer.group.alpha > 0.99,
          );
          if (!layer) continue;
          for (const side of ["left", "right"]) {
            const shoulder = layer.nodes.get(side + "UpperArm").matrix;
            const elbow = layer.nodes.get(side + "Forearm").matrix;
            const hand = layer.nodes.get(side + "Hand").matrix;
            maxHandFlare = Math.max(
              maxHandFlare,
              Math.abs(hand[4] - shoulder[4]),
            );
            minHandDrop = Math.min(minHandDrop, hand[5] - shoulder[5]);
            minForearmDrop = Math.min(minForearmDrop, hand[5] - elbow[5]);
          }
          metrics.idleSamples++;
          finite(actor, "idle");
        }
        metrics.relaxedIdle[kind] = {
          maxHandFlare,
          minHandDrop,
          minForearmDrop,
        };
        if (maxHandFlare >= 14 || minHandDrop <= 22 || minForearmDrop <= 10)
          metrics.failures.push(
            kind + " idle hands must rest below elbows and near the body",
          );
      }
      for (let dir = 0; dir < 8; dir++) {
        const windup = { ...enemy, windup: def.windup * 0.3 };
        actor.updateEnemy(
          windup,
          (dir * Math.PI) / 4,
          2,
          16,
          6000 + dir * 100,
          10,
        );
        actor.updateEnemy(
          windup,
          (dir * Math.PI) / 4,
          2,
          16,
          6080 + dir * 100,
          10,
        );
        finite(actor, "heading " + dir);
        metrics.directionSamples++;
      }
      for (const age of [0, 150, 310, 450, 660]) {
        actor.fall(8000 + age, 8000);
        const first = snapshot(actor);
        actor.fall(8000 + age, 8000);
        if (first !== snapshot(actor))
          metrics.failures.push(kind + " accumulating collapse at " + age);
        finite(actor, "collapse " + age);
        metrics.deathSamples++;
      }
    }
    return metrics;
  });
  report.browserErrors = errors;
  report.artifacts = [
    "test-results/art40-rig-audit/six-views.png",
    "test-results/art40-rig-audit/webgl-motion.png",
  ];
  assert.equal(report.frames.count, 630);
  assert.equal(report.frames.bonesPerKind, 15);
  for (const key of [
    "dimensionMismatches",
    "empty",
    "outsideCrop",
    "disconnected",
    "violations",
  ])
    assert.deepEqual(report.frames[key], [], "atlas " + key);
  assert.equal(report.runtime.renderer, "WebGL");
  assert.equal(report.runtime.actors, 42);
  assert.equal(report.runtime.atlas.width, 40 * 96);
  assert.ok(
    report.runtime.atlas.width <= 4096 && report.runtime.atlas.height <= 4096,
    "bounded shared atlas",
  );
  assert.deepEqual(report.runtime.invalid, []);
  assert.deepEqual(report.runtime.continuityFailures, []);
  assert.equal(report.matrices.directionSamples, 56);
  assert.equal(report.matrices.deathSamples, 35);
  assert.equal(report.matrices.idleSamples, 432);
  assert.deepEqual(report.matrices.failures, []);
  assert.deepEqual(errors, []);
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = error.stack || String(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await vite?.close();
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

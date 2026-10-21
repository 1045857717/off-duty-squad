import { rankingWindow, type RankPeriod } from "../shared/rankPeriod";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import type { GameState, ScoreEntry, Mode, Difficulty } from "../shared/types";
export class ScoreStore {
  private entries: ScoreEntry[] = [];
  private filename: string;
  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.filename = path.join(dir, "squad-scores.json");
    try {
      const data = JSON.parse(readFileSync(this.filename, "utf8"));
      if (Array.isArray(data))
        this.entries = data
          .filter(
            (e) => e && typeof e.id === "string" && typeof e.score === "number",
          )
          .slice(0, 50000);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT")
        console.error(
          "Leaderboard load failed; preserving source file:",
          String(e),
        );
    }
  }
  record(s: GameState) {
    if (
      this.entries.some((e) => e.id === s.runId) ||
      !["won", "lost"].includes(s.phase) ||
      s.elapsed < 15
    )
      return;
    const entry: ScoreEntry = {
      id: s.runId,
      squadName: s.squadName,
      members: s.players.filter((p) => !p.bot).map((p) => p.name),
      mode: s.mode,
      difficulty: s.difficulty,
      wave: s.wave,
      mission: s.mission + 1,
      level: s.level,
      kills: s.stats.kills,
      damage: Math.round(s.players.reduce((n, p) => n + p.damageDealt, 0)),
      score: Math.round(
        (s.mode === "survival" ? (s.wave - 1) * 1800 : s.mission * 2200) +
          (s.phase === "won" ? 15000 : 0) +
          s.stats.kills * 23 +
          s.level * 110 +
          s.coins * 0.5,
      ),
      elapsed: Math.floor(s.elapsed),
      won: s.phase === "won",
      seed: s.seed,
      at: new Date().toISOString(),
    };
    const next = [...this.entries, entry]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.score - a.score)
      .slice(0, 50000);
    const tmp = this.filename + ".tmp";
    writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
    renameSync(tmp, this.filename);
    this.entries = next;
  }
  list(
    mode?: Mode,
    difficulty?: Difficulty,
    period: RankPeriod = "all",
    now = Date.now(),
  ) {
    const window = rankingWindow(period, now);
    return this.entries
      .filter(
        (e) =>
          (!mode || e.mode === mode) &&
          (!difficulty || e.difficulty === difficulty) &&
          (period === "all" ||
            (Date.parse(e.at) >= window.start &&
              Date.parse(e.at) < window.end &&
              Date.parse(e.at) <= now)),
      )
      .sort((a, b) => b.score - a.score || a.elapsed - b.elapsed)
      .slice(0, 50);
  }
}

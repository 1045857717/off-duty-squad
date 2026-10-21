import { ROLES } from "./content";
import { ROLE_SIGNATURE, attackStats } from "./arsenal";
import type { Role, Player } from "./types";
export const CAREER_CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "it", label: "IT" },
  { id: "business", label: "商务行政" },
  { id: "creative", label: "创意" },
  { id: "service", label: "生活服务" },
  { id: "newcomer", label: "初入职场" },
  { id: "absurd", label: "抽象打工人" },
  { id: "capital", label: "资本艺术家" },
] as const;
export type CareerCategory = (typeof CAREER_CATEGORIES)[number]["id"];
const GROUPS: Record<Exclude<CareerCategory, "all">, Role[]> = {
  capital: ["director", "investor", "ppt", "landlord"],
  it: ["scout", "engineer", "qa"],
  business: ["medic", "accountant", "hr", "manager", "sales", "lawyer"],
  creative: ["designer", "creator"],
  service: [
    "guardian",
    "logistics",
    "chef",
    "cleaner",
    "teacher",
    "driver",
    "barista",
  ],
  newcomer: ["intern"],
  absurd: ["workhorse", "blametaker", "slacker", "duck", "deadline"],
};
export function careerCategory(role: Role): CareerCategory {
  return (Object.entries(GROUPS).find(([, roles]) =>
    roles.includes(role),
  )?.[0] || "business") as CareerCategory;
}
export function careerPortrait(role: Role) {
  return `/art/careers/${role}.webp`;
}
export function skillMetrics(
  input:
    | Role
    | Pick<
        Player,
        "role" | "signatureLevel" | "damage" | "maxHp" | "cooldownScale"
      >,
) {
  const role = typeof input === "string" ? input : input.role,
    info = ROLES[role],
    level = typeof input === "string" ? 1 : input.signatureLevel;
  const damageBase = typeof input === "string" ? info.damage : input.damage,
    maxHp = typeof input === "string" ? info.hp : input.maxHp;
  const power = 1 + (level - 1) * 0.2,
    ability = ROLE_SIGNATURE[role],
    cooldown =
      (info.cooldown * (typeof input === "string" ? 1 : input.cooldownScale)) /
      (1 + (level - 1) * 0.05);
  let damage = 0,
    radius = 220,
    shield = 0,
    heal = 0,
    stun = 0,
    notes = "",
    count = 1,
    duration = 0;
  switch (ability) {
    case "pie":
      damage = damageBase * 3.8 * power;
      radius = 280;
      shield = 15 * power;
      stun = 1;
      notes = "巨饼范围击退，附近同伴加盾";
      break;
    case "funding":
      damage = damageBase * 2.4 * power;
      count = 6;
      radius = 600;
      notes = "最多六个目标，单目标独立电击";
      break;
    case "slides":
      damage = damageBase * 1.65 * power;
      count = 16;
      radius = 850;
      notes = "十六页环射，每页穿透1目标";
      break;
    case "rent":
      damage = damageBase * 2.8 * power;
      radius = 300;
      heal = 3 * power;
      notes = "每个命中目标恢复3HP×强度，减速4秒";
      break;
    case "volley":
      damage = damageBase * 1.8 * power;
      count = 7;
      radius = 850;
      notes = "每枚穿透2个目标；下列伤害为单枚";
      break;
    case "nova":
      damage = (70 + damageBase * 2) * power;
      stun = 0.8;
      notes = "击退45距离";
      break;
    case "mend":
      heal = (50 + maxHp * 0.1) * power;
      radius = 260;
      notes = "立即救起范围内倒地队友，实际治疗不超过生命上限";
      break;
    case "aegis":
      shield = 65 * power;
      radius = 270;
      duration = 1.5;
      notes = "同伴无敌1.5秒；护盾最多累计180";
      break;
    case "frost":
      damage = damageBase * 1.6 * power;
      radius = 280;
      stun = 2.2;
      notes = "减速6秒，首领眩晕0.8秒";
      break;
    case "chain":
      damage = damageBase * 3 * power;
      count = 8;
      radius = 650;
      notes = "最多8目标，每目标独立受伤";
      break;
    case "orbit":
      damage = damageBase * 1.5 * power;
      count = 16;
      radius = 850;
      notes = "16方向发射，每枚穿透1次";
      break;
    case "reaper":
      damage = damageBase * 3 * power;
      radius = 300;
      heal = 5;
      notes = "普通敌人低于45%血直接处决；每命中目标回5HP；首领不处决";
      break;
    case "decoy":
      radius = 900;
      duration = 8;
      notes = "前方130放置诱饵8秒；自己无敌1.2秒，无直接伤害";
      break;
    case "supply":
      radius = 260;
      heal = 24 * power;
      shield = 18 * power;
      notes = "队伍获得5零件";
      break;
    case "wok":
      damage = damageBase * 4 * power;
      stun = 1.2;
      notes = "击退50距离，首领眩晕0.4秒";
      break;
    case "sanitize": {
      const l = Math.min(8, level + 2),
        st = attackStats("venom", l);
      damage = damageBase * st.power * 0.3;
      radius = st.radius;
      duration = 4.2;
      shield = 15 * power;
      notes = "每0.5秒一跳（伤害为每跳），护盾范围200";
      break;
    }
    case "bell":
      damage = damageBase * 1.8 * power;
      stun = 2;
      notes = "减速4秒；270内队友冲刺冷却清零；首领眩晕0.4秒";
      break;
    case "rush":
      damage = damageBase * 3 * power;
      radius = 150;
      duration = 0.38;
      notes = "900速度连续突进0.38秒；无敌0.65秒，近敌眩晕0.7秒";
      break;
    case "flash":
      damage = damageBase * 2.5 * power;
      radius = 280;
      stun = 2;
      notes = "自身暴击率+18%持续4秒，无敌1秒；首领眩晕0.4秒";
      break;
    case "injunction":
      damage = damageBase * 2.5 * power;
      shield = 25 * power;
      stun = 2;
      notes = "减速4秒；250内同伴加盾，首领眩晕0.4秒";
      break;
    case "stampede":
      damage = damageBase * 3.4 * power;
      shield = 30 * power;
      radius = 180;
      stun = 0.7;
      notes = "连续突进0.35秒，无敌0.5秒，击退近敌";
      break;
    case "takeblame":
      damage = damageBase * 3.6 * power;
      shield = 40 * power;
      radius = 240;
      stun = 1.4;
      notes = "为同伴加盾；产生600强度噪声6秒";
      break;
    case "paidbreak":
      heal = 20 * power;
      radius = 260;
      duration = 6;
      notes = "650强度诱饵6秒；附近队友冲刺冷却清零";
      break;
    case "paperstorm":
      damage = damageBase * 2.6 * power;
      radius = 280;
      stun = 1.4;
      notes = "纸张风暴减速3秒";
      break;
    case "quack":
      damage = damageBase * 1.8 * power;
      radius = 200;
      stun = 1.5;
      duration = 7;
      notes = "900强度鸭叫诱饵7秒，附近敌人被打断";
      break;
    case "crunch":
      damage = damageBase * 4.5 * power;
      radius = 230;
      stun = 0.6;
      notes = "自己冲刺冷却清零，无敌0.8秒";
      break;
    case "espresso":
      damage = damageBase * 2.5 * power;
      heal = 12 * power;
      radius = 230;
      notes = "队友恢复生命；后续热浪区持续1.05秒，每0.5秒伤害";
      break;
    case "bugfix":
      damage = damageBase * 3.2 * power;
      radius = 300;
      stun = 2;
      notes = "附近队友冲刺冷却清零，敌人减速4秒";
      break;
  }
  const fmt = (n: number) => Math.round(n * 10) / 10;
  const rows: [string, string][] = [
    ["冷却", `${fmt(cooldown)} 秒`],
    ["范围", `${radius} 距离`],
  ];
  if (damage)
    rows.push([
      ability === "sanitize" ? "每跳伤害" : "基础伤害",
      `${fmt(damage)}${count > 1 ? ` × ${count}` : ""}`,
    ]);
  if (heal) rows.push(["恢复生命", `${fmt(heal)} HP`]);
  if (shield) rows.push(["获得护盾", `${fmt(shield)}`]);
  if (stun) rows.push(["控制时间", `${stun} 秒`]);
  if (duration) rows.push(["持续时间", `${duration} 秒`]);
  return {
    ability,
    power,
    level,
    damage,
    radius,
    cooldown,
    heal,
    shield,
    stun,
    rows,
    notes,
    growth: "每级效果强度 +20%，冷却分母 +5%；装备属性同时参与计算。",
  };
}

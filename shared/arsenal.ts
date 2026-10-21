import type { AttackId, Offer, Player, Role, Ability } from "./types";
export const ROLE_SIGNATURE: Record<Role, Ability> = {
  scout: "volley",
  engineer: "nova",
  medic: "mend",
  guardian: "aegis",
  designer: "frost",
  accountant: "chain",
  hr: "orbit",
  manager: "reaper",
  sales: "decoy",
  logistics: "supply",
  chef: "wok",
  cleaner: "sanitize",
  teacher: "bell",
  driver: "rush",
  creator: "flash",
  lawyer: "injunction",
  workhorse: "stampede",
  blametaker: "takeblame",
  slacker: "paidbreak",
  intern: "paperstorm",
  duck: "quack",
  deadline: "crunch",
  barista: "espresso",
  qa: "bugfix",
  director: "pie",
  investor: "funding",
  ppt: "slides",
  landlord: "rent",
};
export const ATTACKS: Record<
  AttackId,
  {
    name: string;
    icon: string;
    color: string;
    element: string;
    desc: string;
    evolution: string;
    cd: number;
    power: number;
    visual: Ability;
  }
> = {
  pulse: {
    name: "改装订书机",
    icon: "target",
    color: "#dfc28b",
    element: "动能",
    desc: "向前打出贯穿订书钉，办公室也能火力覆盖",
    evolution: "全自动装订线",
    cd: 0.62,
    power: 1,
    visual: "volley",
  },
  arc: {
    name: "高压检修线",
    icon: "bolt",
    color: "#e8ce86",
    element: "雷电",
    desc: "电弧跳跃追击周围多个目标",
    evolution: "整层楼都来电",
    cd: 1.7,
    power: 1.2,
    visual: "chain",
  },
  frost: {
    name: "冷凝灭火器",
    icon: "sparkle",
    color: "#9dcfe4",
    element: "寒霜",
    desc: "冷凝剂穿行并减速目标，灭火也灭嚣张",
    evolution: "消防总动员",
    cd: 1.2,
    power: 1.6,
    visual: "frost",
  },
  blade: {
    name: "裁纸刀阵",
    icon: "compass",
    color: "#d9a0b1",
    element: "裂刃",
    desc: "向扇形范围抛出贯穿旋刃",
    evolution: "拒绝无效返工",
    cd: 1.5,
    power: 1.3,
    visual: "orbit",
  },
  orbit: {
    name: "扫地机护卫",
    icon: "shield",
    color: "#b3a8da",
    element: "裂刃",
    desc: "清障扫地机绕身运转，持续切开包围圈",
    evolution: "全楼清障联队",
    cd: 1.8,
    power: 1.8,
    visual: "orbit",
  },
  meteor: {
    name: "高空快递箱",
    icon: "bolt",
    color: "#efa477",
    element: "烈焰",
    desc: "锁定尸群，落下加重快递箱造成冲击",
    evolution: "这单必须送到",
    cd: 2.7,
    power: 3,
    visual: "nova",
  },
  venom: {
    name: "浓缩消毒液",
    icon: "leaf",
    color: "#b0cd80",
    element: "剧毒",
    desc: "喷洒消毒剂形成持续范围，闲人勿近",
    evolution: "地面刚拖过",
    cd: 2.4,
    power: 0.7,
    visual: "reaper",
  },
  drone: {
    name: "桌面风扇组",
    icon: "tool",
    color: "#aac9bd",
    element: "机械",
    desc: "改装风扇发出交叉气流，风大也要站稳",
    evolution: "中央空调已开",
    cd: 0.85,
    power: 0.8,
    visual: "volley",
  },
  flame: {
    name: "食堂喷火枪",
    icon: "bolt",
    color: "#e58e69",
    element: "烈焰",
    desc: "灼烧前方扇区，烧穿密集敌群",
    evolution: "锅气拉满",
    cd: 1.1,
    power: 1.4,
    visual: "nova",
  },
  seeker: {
    name: "磁吸扳手",
    icon: "crosshair",
    color: "#9bb9d9",
    element: "机械",
    desc: "磁力工具自动追踪最近目标，精准返修",
    evolution: "维修一条龙",
    cd: 1.8,
    power: 1.9,
    visual: "volley",
  },
  gravity: {
    name: "工业吸尘器",
    icon: "moon",
    color: "#bd9fda",
    element: "虚空",
    desc: "工业吸力把尸群聚成一团，清理更省心",
    evolution: "全员被吸引",
    cd: 3.2,
    power: 2.2,
    visual: "reaper",
  },
  ricochet: {
    name: "复印机光束",
    icon: "arrow",
    color: "#8fcfc6",
    element: "光谱",
    desc: "复印光束折射打击多个目标，谁也不漏印",
    evolution: "一式八份",
    cd: 1.6,
    power: 1.1,
    visual: "chain",
  },
  bat: {
    name: "保安橡胶棍",
    icon: "shield",
    color: "#d5b686",
    element: "近战",
    desc: "前方扇形挥击，击退近身加班怪；不发射弹丸",
    evolution: "下班专用破围棍",
    cd: 0.95,
    power: 2.1,
    visual: "reaper",
  },
  mop: {
    name: "保洁长柄拖把",
    icon: "leaf",
    color: "#95c5bd",
    element: "近战",
    desc: "横扫一圈并减速目标，刚拖的地请别踩",
    evolution: "全层打扫完毕",
    cd: 1.3,
    power: 1.8,
    visual: "orbit",
  },
  wrench: {
    name: "重型管钳",
    icon: "tool",
    color: "#c6ad85",
    element: "近战",
    desc: "近距离重击最前目标并眩晕，对首领也有伤害",
    evolution: "疑难故障排除器",
    cd: 1.5,
    power: 3,
    visual: "nova",
  },
  coffee: {
    name: "保温杯热咖啡",
    icon: "cup",
    color: "#d8ab7b",
    element: "热饮",
    desc: "向前泼洒热咖啡形成持续灼烫扇区，不发射弹丸",
    evolution: "续命加浓双倍杯",
    cd: 2,
    power: 1.5,
    visual: "nova",
  },
};
export const ATTACK_IDS = Object.keys(ATTACKS) as AttackId[];
export const MAX_ATTACK_LEVEL = 8;
export function attackStats(id: AttackId, level: number) {
  const l = Math.max(1, Math.min(8, level)),
    tier = l >= 8 ? 2 : l >= 4 ? 1 : 0,
    a = ATTACKS[id];
  return {
    level: l,
    tier,
    power: a.power * (1 + (l - 1) * 0.25 + tier * 0.35),
    cooldown: a.cd / (1 + (l - 1) * 0.065),
    count: 1 + Math.floor(l / 2) + tier,
    radius: 100 + l * 12 + tier * 28,
  };
}
export function attackOffer(p: Player, id: AttackId): Offer {
  const current = p.arsenal[id] || 0,
    next = current + 1,
    a = ATTACKS[id],
    stats = attackStats(id, next);
  return {
    id: "attack:" + id,
    attackSkill: id,
    rarity: next === 4 || next === 8 ? "epic" : current ? "rare" : "common",
    name: next >= 4 ? a.evolution : a.name,
    icon: a.icon,
    currentLevel: current,
    nextLevel: next,
    desc: current
      ? `LV.${current} → ${next} · 伤害提升，${next === 4 || next === 8 ? "形态进化 / 数量与范围跃升" : "冷却更快 / 规模成长"}。${a.desc}`
      : `解锁 ${a.element}攻击 · ${a.desc}；可与所有已有能力共存。`,
  };
}
export function startingOffers(random: () => number, p: Player): Offer[] {
  const pool = [...ATTACK_IDS];
  return Array.from({ length: 3 }, () =>
    attackOffer(p, pool.splice(Math.floor(random() * pool.length), 1)[0]),
  );
}
export function synergies(p: Player) {
  const a = p.arsenal;
  return [
    a.frost && (a.flame || a.meteor)
      ? {
          id: "thermal",
          name: "霜火骤变",
          desc: "受寒霜减速的敌人受到烈焰伤害+35%",
        }
      : null,
    a.arc && a.gravity
      ? {
          id: "storm",
          name: "磁暴坍缩",
          desc: "雷电击中引力聚集的敌人伤害+30%",
        }
      : null,
    a.drone && a.seeker
      ? { id: "swarm", name: "蜂群智械", desc: "僚机与追踪弹冷却缩短20%" }
      : null,
  ].filter(Boolean) as { id: string; name: string; desc: string }[];
}

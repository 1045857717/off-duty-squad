import { attackAvailable, augmentAvailable, growthPath } from "./growth";
import { ATTACK_IDS, MAX_ATTACK_LEVEL, attackOffer } from "./arsenal";
import type { Ability, Offer, Game, Player } from "./types";
export const ABILITIES: Record<
  Ability,
  { name: string; desc: string; cd: number; icon: string; color: string }
> = {
  volley: {
    name: "碎星齐射",
    desc: "九发高伤穿透弹，撕裂正面敌群",
    cd: 7,
    icon: "target",
    color: "#d2b075",
  },
  nova: {
    name: "熵爆核心",
    desc: "近距离冲击并击退、眩晕周围敌人",
    cd: 11,
    icon: "bolt",
    color: "#e69c6d",
  },
  mend: {
    name: "应急修复",
    desc: "范围治疗并救起倒地队员",
    cd: 15,
    icon: "heart",
    color: "#83c3b5",
  },
  aegis: {
    name: "磁场壁垒",
    desc: "范围护盾与短暂无敌，抵御致命攻击",
    cd: 14,
    icon: "shield",
    color: "#95b5cb",
  },
  frost: {
    name: "绝对零度",
    desc: "冰冻周围敌人，获得移动加速窗口",
    cd: 13,
    icon: "sparkle",
    color: "#9bcbd9",
  },
  chain: {
    name: "雷霆链路",
    desc: "闪电跳跃命中最多八名敌人",
    cd: 9,
    icon: "bolt",
    color: "#dbb975",
  },
  orbit: {
    name: "血月风暴",
    desc: "发射十六枚环形刀刃，清理包围圈",
    cd: 10,
    icon: "compass",
    color: "#cf8c94",
  },
  reaper: {
    name: "收割协议",
    desc: "处决附近低生命敌人，回收生命与经验",
    cd: 16,
    icon: "target",
    color: "#c3a1cf",
  },
  decoy: {
    name: "客户在这边",
    desc: "响铃手机吸引尸群，小队获得短暂无敌",
    cd: 12,
    icon: "users",
    color: "#d6ba83",
  },
  supply: {
    name: "加急件到了",
    desc: "附近队友恢复生命、获得护盾和共享零件",
    cd: 18,
    icon: "tool",
    color: "#d6aa7c",
  },
  wok: {
    name: "这锅我来扛",
    desc: "平底锅范围重击、击退并眩晕",
    cd: 10,
    icon: "shield",
    color: "#d6c9a2",
  },
  sanitize: {
    name: "深度消杀",
    desc: "持续消杀范围与近处同伴保护",
    cd: 14,
    icon: "leaf",
    color: "#8cbab0",
  },
  bell: {
    name: "现在下课",
    desc: "铃声震慑尸群并重置附近同伴冲刺",
    cd: 14,
    icon: "clock",
    color: "#d9c99a",
  },
  rush: {
    name: "末班车不等人",
    desc: "连续突进、无敌并撞开近敌",
    cd: 11,
    icon: "arrow",
    color: "#9fb9ce",
  },
  flash: {
    name: "补光开到最大",
    desc: "闪光致盲、范围伤害并短时提高暴击",
    cd: 13,
    icon: "sparkle",
    color: "#e0c7bb",
  },
  injunction: {
    name: "禁止强制加班",
    desc: "范围压制、减速与队友护盾",
    cd: 15,
    icon: "book",
    color: "#aebccc",
  },
  stampede: {
    name: "牛马冲锋",
    desc: "背着待办突围，击退近敌并获得护盾。",
    cd: 13,
    icon: "shield",
    color: "#b8936f",
  },
  takeblame: {
    name: "锅从天上来",
    desc: "黑锅落地震慑近敌，给周围队友保护。",
    cd: 15,
    icon: "shield",
    color: "#8e9ba6",
  },
  paidbreak: {
    name: "带薪午休",
    desc: "响铃诱饵引尸，附近队友恢复生命与冲刺。",
    cd: 17,
    icon: "cup",
    color: "#8caaa2",
  },
  paperstorm: {
    name: "收到收到",
    desc: "把积压的待办变成纸张风暴，短暂定住敌群。",
    cd: 9,
    icon: "book",
    color: "#d2b878",
  },
  quack: {
    name: "嘎嘎调试",
    desc: "鸭叫制造强力诱饵，打断并击伤近处敌人。",
    cd: 12,
    icon: "bolt",
    color: "#d7b85e",
  },
  crunch: {
    name: "最后一分钟",
    desc: "范围爆发并刷新冲刺，短暂无敌强行交付。",
    cd: 14,
    icon: "clock",
    color: "#bc806e",
  },
  espresso: {
    name: "双倍浓缩",
    desc: "热浪灼烫附近敌人，提神并小量治疗队友。",
    cd: 12,
    icon: "cup",
    color: "#9fae8b",
  },
  bugfix: {
    name: "强制回归",
    desc: "标记并压制近敌，重置附近队友冲刺。",
    cd: 13,
    icon: "target",
    color: "#9aabb9",
  },
  pie: {
    name: "饼从天降",
    desc: "巨饼砸中近敌，附送全队一点精神护盾。",
    cd: 14,
    icon: "grid",
    color: "#c79252",
  },
  funding: {
    name: "天使轮暴投",
    desc: "最多六个目标连锁电击，每一笔都是天使轮。",
    cd: 13,
    icon: "bolt",
    color: "#ba9c65",
  },
  slides: {
    name: "一页定乾坤",
    desc: "16页幻灯片环射，主打一个全员同步。",
    cd: 11,
    icon: "book",
    color: "#a791b4",
  },
  rent: {
    name: "到点交租",
    desc: "范围收费并减速，每个命中目标恢复少量生命。",
    cd: 16,
    icon: "tool",
    color: "#86a7a0",
  },
};
export const AUGMENTS: Offer[] = [
  {
    id: "damage",
    rarity: "common",
    name: "作战增幅",
    desc: "伤害 +22%",
    icon: "target",
  },
  {
    id: "health",
    rarity: "common",
    name: "纳米骨架",
    desc: "生命上限 +30，恢复40生命",
    icon: "heart",
  },
  {
    id: "speed",
    rarity: "common",
    name: "相位步伐",
    desc: "移速 +10%，冲刺冷却降低",
    icon: "bolt",
  },
  {
    id: "rate",
    rarity: "common",
    name: "过载节律",
    desc: "所有攻击模块间隔降低14%",
    icon: "crosshair",
  },
  {
    id: "regen",
    rarity: "common",
    name: "共生细胞",
    desc: "每秒恢复1.4生命",
    icon: "leaf",
  },
  {
    id: "shield",
    rarity: "common",
    name: "屏障电容",
    desc: "护盾上限 +30，立即充满护盾",
    icon: "shield",
  },
  {
    id: "crit",
    rarity: "rare",
    name: "弱点分析",
    desc: "暴击率 +12%，暴击伤害 +20%",
    icon: "target",
  },
  {
    id: "multishot",
    rarity: "epic",
    name: "分裂弹舱",
    desc: "投射攻击额外一枚弹丸，伤害 +6%",
    icon: "crosshair",
  },
  {
    id: "pierce",
    rarity: "rare",
    name: "钨芯贯穿",
    desc: "弹丸多穿透一个目标，伤害 +8%",
    icon: "arrow",
  },
  {
    id: "vampire",
    rarity: "rare",
    name: "猩红回路",
    desc: "造成伤害的3%转化为生命",
    icon: "heart",
  },
  {
    id: "thorns",
    rarity: "rare",
    name: "反应装甲",
    desc: "反伤 +22，立即获得15护盾",
    icon: "shield",
  },
  {
    id: "magnet",
    rarity: "common",
    name: "引力收集器",
    desc: "拾取范围 +65，拾取经验 +12%",
    icon: "compass",
  },
  {
    id: "cooldown",
    rarity: "rare",
    name: "时序压缩",
    desc: "主动技能冷却降低16%",
    icon: "clock",
  },
  {
    id: "orbiting",
    rarity: "epic",
    name: "游离刃环",
    desc: "每1.3秒自动伤害附近敌人",
    icon: "sparkle",
  },
  {
    id: "explosive",
    rarity: "epic",
    name: "尸爆协议",
    desc: "击杀产生爆炸，攻击周围敌人",
    icon: "bolt",
  },
  {
    id: "dashfire",
    rarity: "rare",
    name: "燎原引擎",
    desc: "冲刺沿途释放伤害脉冲",
    icon: "bolt",
  },
  {
    id: "glass",
    rarity: "cursed",
    name: "玻璃王冠",
    desc: "伤害 +45%，最大生命降低18%",
    icon: "target",
  },
  {
    id: "bloodpact",
    rarity: "cursed",
    name: "深渊契约",
    desc: "攻击间隔降低30%，怪物难度永久+1层",
    icon: "moon",
  },
  {
    id: "execution",
    rarity: "epic",
    name: "终结者",
    desc: "低于18%生命的普通怪受到双倍伤害",
    icon: "target",
  },
  {
    id: "guardian",
    rarity: "rare",
    name: "战地纽带",
    desc: "救起队友后双方获得45护盾",
    icon: "users",
  },
];
export const RARITY = {
  common: "常规",
  rare: "稀有",
  epic: "史诗",
  cursed: "诅咒",
};
export function generateOffers(g: Game, p: Player): Offer[] {
  const owned = ATTACK_IDS.filter(
    (id) => (p.arsenal[id] || 0) > 0 && (p.arsenal[id] || 0) < MAX_ATTACK_LEVEL,
  );
  const result: Offer[] = [];
  if (owned.length)
    result.push(attackOffer(p, owned[Math.floor(g.random() * owned.length)]));
  const pool: Offer[] = [
    ...ATTACK_IDS.filter(
      (id) =>
        (p.arsenal[id] || 0) < MAX_ATTACK_LEVEL &&
        attackAvailable(p, id, g.state.level),
    ).map((id) => attackOffer(p, id)),
    ...AUGMENTS.filter((card) =>
      augmentAvailable(p, card.id, g.state.level, g.state.players.length),
    ).map((card) => ({
      ...card,
      currentLevel: p.upgrades.filter((id) => id === card.id).length,
      nextLevel: p.upgrades.filter((id) => id === card.id).length + 1,
      desc: `LV.${p.upgrades.filter((id) => id === card.id).length} → ${p.upgrades.filter((id) => id === card.id).length + 1} · ${card.desc}`,
    })),
  ];
  if (p.signatureLevel < 8)
    pool.push({
      id: "signature",
      rarity: "rare",
      name: "职业核心增幅",
      desc: "职业Q伤害/治疗/护盾提升，冷却缩短；保留所有攻击模块",
      icon: "users",
      currentLevel: p.signatureLevel,
      nextLevel: p.signatureLevel + 1,
    });
  while (result.length < 3 && pool.length) {
    const card = pool.splice(Math.floor(g.random() * pool.length), 1)[0];
    if (!result.some((c) => c.id === card.id)) result.push(card);
  }
  return result.map((card) => ({
    ...card,
    growthPath: growthPath(p, card.id),
  }));
}
export function applyAugment(p: Player, id: string): boolean {
  const card = p.offers.find((o) => o.id === id);
  if (!card) return false;
  if (card.attackSkill) {
    const level = p.arsenal[card.attackSkill] || 0;
    if (level >= MAX_ATTACK_LEVEL) return false;
    p.arsenal[card.attackSkill] = level + 1;
    p.attackCooldowns[card.attackSkill] = 0;
  } else if (id === "signature") {
    if (p.signatureLevel >= 8) return false;
    p.signatureLevel++;
  } else {
    if (!AUGMENTS.some((c) => c.id === id)) return false;
    if (id === "damage") p.damage *= 1.22;
    if (id === "health") {
      p.maxHp += 30;
      p.hp = Math.min(p.maxHp, p.hp + 40);
    }
    if (id === "speed") {
      p.speed = Math.min(390, p.speed * 1.1);
    }
    if (id === "rate") p.rate = Math.max(0.065, p.rate * 0.86);
    if (id === "regen") p.regen += 1.4;
    if (id === "shield") {
      p.shieldCap += 30;
      p.shield = p.shieldCap;
    }
    if (id === "crit") {
      p.crit = Math.min(0.75, p.crit + 0.12);
      p.critPower += 0.2;
    }
    if (id === "multishot") {
      p.projectiles = Math.min(7, p.projectiles + 1);
      p.damage *= 1.06;
    }
    if (id === "pierce") {
      p.pierce++;
      p.damage *= 1.08;
    }
    if (id === "vampire") p.lifesteal += 0.03;
    if (id === "thorns") {
      p.thorns += 22;
      p.shield += 15;
    }
    if (id === "magnet") p.magnet += 65;
    if (id === "cooldown")
      p.cooldownScale = Math.max(0.3, p.cooldownScale * 0.84);
    if (id === "glass") {
      p.damage *= 1.45;
      p.maxHp = Math.max(35, Math.floor(p.maxHp * 0.82));
      p.hp = Math.min(p.hp, p.maxHp);
    }
    if (id === "bloodpact") {
      p.rate = Math.max(0.065, p.rate * 0.7);
      p.curse++;
    }
    p.upgrades.push(id);
  }
  p.pendingUpgrades = Math.max(0, p.pendingUpgrades - 1);
  p.offers = [];
  return true;
}

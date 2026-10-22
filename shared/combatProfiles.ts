import type { EnemyKind, AttackId, Ability } from "./types";
export const ENEMY_DEFS: Record<
  EnemyKind,
  {
    name: string;
    title: string;
    hp: number;
    speed: number;
    damage: number;
    windup: number;
    range: number;
    cooldown: number;
    attack: string;
    counter: string;
    model: string;
    role: string;
    icon: string;
  }
> = {
  mite: {
    name: "催办纸魔",
    title: "近战 / 折纸快爪",
    hp: 38,
    speed: 160,
    damage: 8,
    windup: 0.55,
    range: 65,
    cooldown: 1.25,
    attack:
      "卷宗折成的小纸魔碎步逼近，纸爪收向肩后蓄力，再向锁定位置撕划；小体型、低单次伤害。",
    counter: "看见抬爪就横向走开，别停在刚才的位置。",
    model: "zombie-mite",
    role: "scout",
    icon: "book",
  },
  hound: {
    name: "爬行催办尸",
    title: "冲锋 / 伏地追猎",
    hp: 58,
    speed: 132,
    damage: 14,
    windup: 0.65,
    range: 230,
    cooldown: 2.3,
    attack:
      "穿破衬衫的办公室丧尸以长臂撑地，蜷腿压低重心后沿蓄力时锁定的朝向直线扑冲，撞击基础伤害22。",
    counter: "不要沿直线后退，横向冲刺躲开追击路线。",
    model: "zombie-hound",
    role: "engineer",
    icon: "bolt",
  },
  shooter: {
    name: "附身碳粉机",
    title: "远程 / 三发碳粉散射",
    hp: 85,
    speed: 75,
    damage: 20,
    windup: 0.7,
    range: 560,
    cooldown: 1.8,
    attack:
      "附身打印机合紧出纸颌、收臂蓄压，随后开颌后坐，喷出3枚浸酸碳粉纸团；弹速255，弹丸伤害为基础值的72%。",
    counter: "观察碳粉纸团的轨迹，借助墙和工位挡住散射。",
    model: "zombie-shooter",
    role: "designer",
    icon: "target",
  },
  tank: {
    name: "文件柜魔像",
    title: "重装 / 抽屉拳重砸",
    hp: 170,
    speed: 62,
    damage: 27,
    windup: 0.9,
    range: 65,
    cooldown: 1.25,
    attack:
      "沉重铁皮文件柜抬起两只抽屉拳，肘铰链折起蓄力后向锁定位置砸落，冲击半径92。",
    counter: "别贪刀，举拳时先拉开距离，再绕回身后输出。",
    model: "zombie-tank",
    role: "guardian",
    icon: "shield",
  },
  wraith: {
    name: "无休晨会幽灵",
    title: "召集 / 五发话音散射",
    hp: 78,
    speed: 108,
    damage: 20,
    windup: 0.8,
    range: 560,
    cooldown: 1.25,
    attack:
      "会议纪要裹成的空袍幽灵悬浮展开纸袖，抬头张开空洞的口部嚎叫增援，也会朝前发出5枚话音弹。",
    counter: "优先清理，免得被它叫来的同事包围。",
    model: "zombie-wraith",
    role: "director",
    icon: "volume",
  },
  bomber: {
    name: "超压咖啡机",
    title: "自爆 / 唯一地面红圈",
    hp: 65,
    speed: 95,
    damage: 20,
    windup: 1,
    range: 80,
    cooldown: 1.25,
    attack:
      "黄铜咖啡机抱紧压力罐，阀门张开、机身高频颤动；自身周围显示118半径红圈，倒计时后自爆。",
    counter: "看到红圈立刻离开；可以提前击败，别把爆炸带到队友身边。",
    model: "zombie-bomber",
    role: "chef",
    icon: "cup",
  },
  boss: {
    name: "绩效尸董",
    title: "首领 / KPI弹幕与追猎",
    hp: 1800,
    speed: 64,
    damage: 32,
    windup: 1,
    range: 560,
    cooldown: 2.1,
    attack:
      "戴柱状绩效冠的巨型丧尸高管后拧肩肘，张开双臂甩出18枚环形大饼，依次经历护具、追猎与点名召集阶段。",
    counter: "保留冲刺穿过弹幕缺口；看全局血条，配合队友处理增援。",
    model: "zombie-boss",
    role: "director",
    icon: "trophy",
  },
};
export type AttackMotionKind =
  | "shoot"
  | "slash"
  | "sweep"
  | "overhead"
  | "throw"
  | "channel"
  | "summon";
export const ATTACK_MOTIONS: Record<
  AttackId,
  { kind: AttackMotionKind; duration: number; accent: string }
> = {
  pulse: { kind: "shoot", duration: 300, accent: "装订后坐" },
  blade: { kind: "throw", duration: 330, accent: "甩出裁纸刃" },
  orbit: { kind: "channel", duration: 430, accent: "双臂维持刃环" },
  arc: { kind: "channel", duration: 330, accent: "指尖放电" },
  frost: { kind: "shoot", duration: 330, accent: "举起冷冻工具" },
  flame: { kind: "sweep", duration: 400, accent: "横扫喷焰" },
  venom: { kind: "throw", duration: 360, accent: "抛出清洁剂" },
  drone: { kind: "summon", duration: 420, accent: "托举放飞无人机" },
  meteor: { kind: "overhead", duration: 500, accent: "双手上举召唤落物" },
  ricochet: { kind: "throw", duration: 300, accent: "甩出弹射夹" },
  gravity: { kind: "channel", duration: 450, accent: "双臂牵引重力" },
  seeker: { kind: "summon", duration: 390, accent: "推出追踪弹" },
  bat: { kind: "slash", duration: 470, accent: "侧身蓄棒挥击" },
  mop: { kind: "sweep", duration: 450, accent: "腰胯带动双手扫地" },
  wrench: { kind: "overhead", duration: 450, accent: "抬肘下砸扳手" },
  coffee: { kind: "throw", duration: 380, accent: "抛洒咖啡" },
};

export const SIGNATURE_MOTIONS: Record<Ability, AttackMotionKind> = {
  volley: "throw",
  nova: "overhead",
  mend: "channel",
  aegis: "channel",
  frost: "sweep",
  chain: "channel",
  orbit: "sweep",
  reaper: "slash",
  decoy: "summon",
  supply: "throw",
  wok: "overhead",
  sanitize: "sweep",
  bell: "overhead",
  rush: "slash",
  flash: "throw",
  injunction: "overhead",
  stampede: "sweep",
  takeblame: "channel",
  paidbreak: "channel",
  paperstorm: "sweep",
  quack: "throw",
  crunch: "overhead",
  espresso: "throw",
  bugfix: "channel",
  pie: "overhead",
  funding: "throw",
  slides: "sweep",
  rent: "channel",
};

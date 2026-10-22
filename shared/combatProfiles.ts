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
    name: "催进度专员",
    title: "近战 / 小体型快跑",
    hp: 38,
    speed: 160,
    damage: 8,
    windup: 0.55,
    range: 65,
    cooldown: 1.25,
    attack: "靠近后先抬手蓄力，再朝锁定位置拍出文件夹。",
    counter: "看见抬臂就横向走开，别停在刚才的位置。",
    model: "developer",
    role: "scout",
    icon: "book",
  },
  hound: {
    name: "轮滑催办员",
    title: "冲锋 / 高机动",
    hp: 58,
    speed: 132,
    damage: 14,
    windup: 0.65,
    range: 230,
    cooldown: 2.3,
    attack: "先压低重心，随后沿蓄力时锁定的朝向直线冲刺，撞击基础伤害22。",
    counter: "不要沿直线后退，横向冲刺躲开追击路线。",
    model: "technician",
    role: "engineer",
    icon: "bolt",
  },
  shooter: {
    name: "吐纸打印机",
    title: "远程 / 三发散射",
    hp: 85,
    speed: 75,
    damage: 20,
    windup: 0.7,
    range: 560,
    cooldown: 1.8,
    attack: "打印口亮起橙光后发出3枚纸团；弹速255，弹丸伤害为基础值的72%。",
    counter: "观察纸团轨迹，借助墙和工位挡住散射。",
    model: "designer",
    role: "designer",
    icon: "target",
  },
  tank: {
    name: "文件柜壮汉",
    title: "重装 / 大范围近战",
    hp: 170,
    speed: 62,
    damage: 27,
    windup: 0.9,
    range: 65,
    cooldown: 1.25,
    attack: "双手举高文件柜，蓄力后砸向锁定位置，冲击半径92。",
    counter: "别贪刀，抬柜时先拉开距离，再绕回身后输出。",
    model: "security",
    role: "guardian",
    icon: "shield",
  },
  wraith: {
    name: "电话会议怪",
    title: "召集 / 五发散射",
    hp: 78,
    speed: 108,
    damage: 20,
    windup: 0.8,
    range: 560,
    cooldown: 1.25,
    attack: "举起电话呼叫增援，也会朝前发出5枚话音弹。",
    counter: "优先清理，免得被它叫来的同事包围。",
    model: "director",
    role: "director",
    icon: "volume",
  },
  bomber: {
    name: "咖啡自爆桶",
    title: "自爆 / 唯一地面红圈",
    hp: 65,
    speed: 95,
    damage: 20,
    windup: 1,
    range: 80,
    cooldown: 1.25,
    attack: "桶体闪烁并抱紧咖啡，自身周围显示118半径红圈，倒计时后自爆。",
    counter: "看到红圈立刻离开；可以提前击败，别把爆炸带到队友身边。",
    model: "chef",
    role: "chef",
    icon: "cup",
  },
  boss: {
    name: "巨饼总监",
    title: "首领 / 弹幕与追猎",
    hp: 1800,
    speed: 64,
    damage: 32,
    windup: 1,
    range: 560,
    cooldown: 2.1,
    attack: "张开双臂甩出18枚环形大饼，依次经历护具、追猎与点名召集阶段。",
    counter: "保留冲刺穿过弹幕缺口；看全局血条，配合队友处理增援。",
    model: "director",
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

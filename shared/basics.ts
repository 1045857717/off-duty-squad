import type { AttackId, Role } from "./types";
export type BasicAttack = {
  name: string;
  weapon: AttackId;
  power: number;
  cooldown: number;
  range: number;
  ranged: boolean;
  description: string;
};
const basic = (
  name: string,
  weapon: AttackId,
  power: number,
  cooldown: number,
  range: number,
  ranged = false,
): BasicAttack => ({
  name,
  weapon,
  power,
  cooldown,
  range,
  ranged,
  description: ranged
    ? "朝瞄准方向发射职场工具，命中造成伤害。"
    : "朝瞄准方向挥击，命中前方扇形内的敌人。",
});
/** Innate attacks never occupy the four random-module slots or replace Q. */
export const ROLE_BASICS: Record<Role, BasicAttack> = {
  scout: basic("键盘回车拳", "pulse", 0.9, 0.74, 560, true),
  engineer: basic("物理重启", "wrench", 1.15, 0.9, 122),
  medic: basic("关怀泼水", "coffee", 0.9, 0.78, 148),
  guardian: basic("下班警棍", "bat", 1.1, 0.86, 136),
  designer: basic("一刀过稿", "blade", 0.85, 0.76, 530, true),
  accountant: basic("算你一笔", "ricochet", 0.95, 0.8, 550, true),
  hr: basic("简历直投", "blade", 0.88, 0.78, 520, true),
  manager: basic("需求拍板", "bat", 1.08, 0.86, 134),
  sales: basic("名片直达", "ricochet", 0.9, 0.74, 560, true),
  logistics: basic("快递到脸", "wrench", 1.05, 0.86, 132),
  chef: basic("锅铲翻面", "wrench", 1.12, 0.9, 128),
  cleaner: basic("扫除班味", "mop", 0.87, 0.84, 158),
  teacher: basic("重点敲黑板", "bat", 1.0, 0.84, 144),
  driver: basic("扳手超车", "wrench", 1.15, 0.9, 124),
  creator: basic("切片输出", "blade", 0.86, 0.74, 540, true),
  lawyer: basic("当面举证", "ricochet", 0.95, 0.8, 540, true),
  workhorse: basic("牛马甩蹄", "bat", 1.15, 0.88, 140),
  blametaker: basic("黑锅回旋", "meteor", 1.1, 0.92, 144),
  slacker: basic("带薪泼咖啡", "coffee", 0.88, 0.82, 154),
  intern: basic("文件飞送", "blade", 0.88, 0.74, 540, true),
  duck: basic("鸭力反弹", "ricochet", 0.92, 0.78, 530, true),
  deadline: basic("截止日砸场", "meteor", 1.16, 0.94, 142),
  barista: basic("意式提神", "coffee", 0.92, 0.78, 158),
  qa: basic("缺陷回传", "pulse", 0.88, 0.74, 560, true),
  director: basic("大饼拍脸", "meteor", 1.12, 0.94, 148),
  investor: basic("硬币天使轮", "ricochet", 0.96, 0.8, 550, true),
  ppt: basic("翻页如飞刀", "blade", 0.9, 0.76, 540, true),
  landlord: basic("钥匙催租", "wrench", 1.12, 0.9, 126),
};
export function basicMetrics(role: Role, damage: number) {
  const b = ROLE_BASICS[role];
  return {
    ...b,
    damage: Math.round(damage * b.power * 10) / 10,
    dps: Math.round(((damage * b.power) / b.cooldown) * 10) / 10,
  };
}

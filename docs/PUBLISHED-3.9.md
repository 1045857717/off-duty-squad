# 3.9.0正式发行验收 / Published release verification

[项目主页](../README.md) · [English README](../README.en.md) · [原始验收数据](publication-3.9.json) · [本地回归](validation-3.9.json) · [性能实测](PERFORMANCE-3.9.md)

本页记录已实际完成的发布和运行检查。正式版：[Paid Break Crew v3.9.0](https://github.com/1045857717/off-duty-squad/releases/tag/v3.9.0)，发布时间2026-10-22T06:03:51Z。源码提交 `a457ba46bbe39219d253b86eceed160b09d4653e`，已签名的主分支合并包含PR#6；标签对象 `d34008dca68f5982dabcd7b1ed05692f9b932856`。标签与发行附件保持不变，之后的文档提交不覆盖版本镜像。

| 项目         | 实际结果                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主分支检查   | [三项CI通过](https://github.com/1045857717/off-duty-squad/actions/runs/39730464974)：120核心/网络测试、5发行测试、类型/构建/格式；源码容器与真实浏览器关节/小窗回归 |
| 正式发行     | [Windows包与多架构镜像发布成功](https://github.com/1045857717/off-duty-squad/actions/runs/39730836439)，六个附件齐全，SHA-256核对一致                               |
| amd64运行    | 容器内Node实际架构x64、平台linux；HTTP/桌面包下载/双客户端联机与持久化通过                                                                                          |
| arm64运行    | QEMU下容器内Node实际架构arm64、平台linux，同样通过；[实际双架构运行](https://github.com/1045857717/off-duty-squad/actions/runs/39731738727)                         |
| 本机公开镜像 | 使用独立空登录配置匿名拉取成功；实际容器通过健康、页面、双客户端、公屏/队内隔离、普攻、倒计时/选卡及排行榜重启持久化检查                                            |
| 桌面附件     | 142929483字节；87个文件，CRC正确，启动文件带薪摸鱼.exe；主程序源码与发布源码一致，不含私有game-server.json                                                          |
| 附件一致性   | 镜像内ZIP、GitHub附件digest、desktop-release.json与SHA256SUMS一致                                                                                                   |
| GitHub状态   | main实际保护开启；管理员受约束，禁止强推/删除；PR、最新基线、三项必需检查和解决讨论均为要求                                                                         |
| Release列表  | 仅保留v3.9.0；已移除v3.5–v3.8的Release对象，Git标签和历史镜像保留                                                                                                   |

镜像完整引用：

```text
ghcr.io/1045857717/off-duty-squad@sha256:043b619a67b0491622b711b6f41e74f37fa736b10c9be8a771b235c31dd57ad2
```

公开桌面包SHA-256：

```text
3db74966a3355bba2a7dc1a0560158ae37f45c10ca0089c72b6fc33141e1c9cb
```

`latest`与`3.9.0`指向同一镜像摘要。生产环境仍建议固定完整版本或digest。咖啡二维码继续只在仓库文档中，已验证实际游戏构建/镜像没有公开的二维码文件。

## 验证范围与限制 / Scope

本地52组浏览器回归覆盖28职业普攻、16攻击模块、28职业Q、全部7类15关节丧尸的8方向与真实GPU提交，另含带延迟联机、观战聊天、重连、结算重开和小窗/PiP会话交接。死亡检查按实际渲染帧记录短暂的倒地状态，不依靠固定毫秒等待。

本机原生窗口/IPC及实际对局通过源码客户端验证；公开便携包验证覆盖完整性、版本、启动文件、源码一致性及镜像下载。额外的便携EXE日志重启复测被工具自动审批拦截（只返回blocked by policy，没有具体原因），因此没有将该项记为通过。Windows包未做作者代码签名。

完整压力场景并非稳定144FPS，两个有效样本分别为完整画面137.72/153.11、小窗186.31/122.67FPS（明确解除浏览器同步限制的实验环境）；两项144断言均保留。普通144档位约143FPS。详见[中文性能报告](PERFORMANCE-3.9.md)与[English performance report](PERFORMANCE-3.9.en.md)。没有把硬件/调度导致的失败门槛标成通过，也未声称完成真实公网跨机器长期测试。

Published assets and both actual Linux runtime architectures passed. The local native source client and public archive integrity/source consistency were verified; the additional packaged-EXE log-relaunch probe was refused by automatic local tool review and is not counted as a passing GUI test. Dense-scene144FPS remains a measured limitation. Retaining only the latest Release does not delete Git tags, Docker rollback images or persistent game data.

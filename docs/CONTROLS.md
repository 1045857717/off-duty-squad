# 操作与平台说明 / Controls and platform support

[中文主页](../README.md) · [English README](../README.en.md)

| 按键 / Key                       | 中文                                           | English                                                                   |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| WASD / 方向键 / arrows           | 移动                                           | Move                                                                      |
| 鼠标 / mouse                     | 瞄准                                           | Aim                                                                       |
| 空格 / Space、右键 / right mouse | 冲刺                                           | Dash                                                                      |
| Shift                            | 设置中可选的冲刺按键，默认关闭以减少输入法冲突 | Optional dash binding, disabled by default                                |
| Q                                | 职业固定技能                                   | Profession signature skill                                                |
| E                                | 按住交互、设施、救援；观察进度与失败反馈       | Hold for interactions, facilities or revives; watch progress and feedback |
| T                                | 自动攻击开关                                   | Toggle auto attack                                                        |
| 1 / 2 / 3                        | 选择成长选项，不暂停移动                       | Select an upgrade without blocking movement                               |
| U                                | 展开 / 收起成长选择                            | Show / hide upgrade choices                                               |
| H                                | 倒地呼救，全员阵亡后不可用                     | Call for help while downed; unavailable after a squad wipe                |
| Enter                            | 输入聊天，发送后退出输入                       | Chat; exit input after sending                                            |
| Esc                              | 退出输入、面板或当前小窗交互                   | Dismiss input or panel                                                    |
| F2                               | 设置                                           | Settings                                                                  |
| F3                               | 桌面端下载 / 入口                              | Desktop client download / entry                                           |
| F4                               | 小窗工具栏自动收起 / 常驻                      | Auto-hide / keep the compact toolbar visible                              |
| F6                               | 画中画 / 独立浏览器窗口，同一玩家会话          | Explicit PiP / popup with the same player session                         |
| F7                               | 实时伤害排名                                   | Live damage board                                                         |
| F8                               | 工作模式                                       | Work view                                                                 |
| F9                               | 520×350低调视图 / 原生小窗，按同键恢复         | 520×350 quiet view / native window; press again to restore                |
| F10                              | 隐藏 / 恢复当前界面或桌面窗口                  | Hide / restore the current view or desktop window                         |
| Ctrl + Shift + B                 | 桌面端全局恢复                                 | Desktop global restore                                                    |
| Ctrl + Shift + X                 | 桌面端鼠标穿透开关                             | Desktop click-through toggle                                              |

## 固有普攻 / Innate ordinary attacks

每个职业自带固定普攻，不占四个随机模块槽，也不替换职业Q。鼠标左键或自动攻击会同时触发普攻和已装配模块；T切换自动攻击。进入地图后的首张随机模块选择仍保留，全员完成后开始战斗。

Every profession has a fixed ordinary attack independent of the four random-module slots and Q. Left-click or auto attack triggers the innate attack alongside equipped modules; T toggles auto attack. The shared first-module draft remains inside the map, with combat starting once everyone has chosen.

## F9低调视图 / Quiet view

F9在网页中把画面缩到当前页面角落；在Windows客户端中调整真正无边框窗口的尺寸。两者都使用520×350目标尺寸、静音和自动收起工具栏，标题为「状态面板」。F6单独负责浏览器画中画/弹出窗口，关闭小窗会收回原玩家；F4切换工具栏自动收起/常驻。

F9 shrinks the web view inside its current page, and resizes the actual frameless window in the Windows client. Both target520×350, mute sound and retract the toolbar with a neutral title. F6explicitly detaches through browser PiP/popup; closing it returns the same player. F4keeps the toolbar visible or enables auto-hide.

## 平台边界 / Platform limits

网页无法隐藏整个浏览器进程，也不能通过页面透明度显示浏览器后方桌面。画中画 / 弹出窗口需要浏览器支持，并可能要求一次用户点击。真正的无边框透明窗口、鼠标穿透与全局恢复由 Windows 客户端实现。

A website cannot hide the browser process or expose the desktop by changing page opacity. Picture-in-picture / popup behavior depends on the browser and may require a user gesture. Native frameless transparency, click-through and global restore are provided by the Windows client.

聊天、设置及编辑器输入获得焦点时，游戏按键会让位于文本编辑。快捷键可能被系统、输入法或浏览器占用，可通过界面按钮使用对应功能。

Chat, settings and editor inputs take priority over game key bindings. Operating systems, input methods and browsers may reserve shortcuts; the corresponding UI controls remain available.

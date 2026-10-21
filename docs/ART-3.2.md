# 3.2 素材与动画

本轮图片使用 **gpt-image-2**，通过明确调用image2技能的CLI转发路径生成，非内置图片工具。服务地址沿用本机Codex provider。提示词完整保存在docs/art-specs-3.2，无需重新猜测。

## 项目素材路径

- public/art/generated/gameplay-workers-a-v32.png：开发、维修、安保、行政4角色×4方向全身转面表。
- public/art/generated/gameplay-workers-b-v32.png：牛马、厨师、总监、设计4角色×4方向全身转面表。
- public/art/generated/capitalists-v32.png：4资本职业肖像。
- public/art/generated/lobby-comedy-v32.png：职场抽象喜剧主视觉。
- public/art/gameplay/：裁切与本地背景处理后的8张4方向游戏纹理。
- public/art/careers/：28职业肖像。
- public/art/effects/combat-atlas.png：8类叠加特效合批纹理。

全身提示词要求成熟比例、轻夸张、清晰手脚、自然服装，禁止幼儿/日漫Q版；四列固定为正、斜、侧、后。所有头脚在格内，手不拿道具，纯白不透明底用于本地处理。并未请求Image2原生透明背景。脚本按边界连通白色去背景，保留封闭白色衣服；没有为了透明效果切换模型。

游戏纹理遵循统一像素基准，肩/髋/头部围绕枢轴生成8方向×24步态与待机、16施法/救援帧。28职业复用8个基础角色族并加配件；动态位置与帧率插值分开。敌人同样使用对应画风并增加打印机、咖啡桶、电话、巨饼等办公室道具。并不是28套独立3D模型，也不是AI原生动作视频。

原始提示词包含exact text = none、无字、无标识、无水印；界面标题、广告、技能数值均由HTML或引擎文本渲染，不烘在图片里。

# 4.0 art and combat presentation

Night Office Oddities uses ink outlines, cel value groups, paper, enamel and aged brass. Detail concentrates on faces, hands, tools and hostile attack parts; floors stay quiet. The Spell Brigade informed silhouette and crowded co-op readability. Its assets, characters, maps and branding were not copied.

## Source and tools

- Official reference: https://store.steampowered.com/app/2904000
- Developer interview: https://80.lv/articles/developing-the-spell-brigade-online-co-op-action-game-about-wizards
- Design workflow: https://github.com/pbakaus/impeccable, the installed skill, with game-art, 2d-games, ui-ux-pro-max and systematic-debugging. This is an audit/design method, not an automatic anti-AI filter.

The new art is editable native Canvas/vector code, baked once into Phaser textures. No image model was invoked. The current tool surface did not expose image_gen, and no unapproved CLI fallback was substituted. Historical assets remain separately documented.

## Pipeline

Eight human models, six authored views and fourteen joints produce 672 part frames. UI portraits share the same artwork. Twenty-eight professions have their own everyday tools, with distinct paper, coin, cutter, duck, keycap and other projectiles. A normal attack never consumes a random module slot or replaces Q.

Seven enemy kinds, six views and fifteen joints produce 630 frames. The roster includes paperwork imps, possessed toner printers, cabinet golems, meeting ghosts and pressure coffee machines alongside undead crawlers and an executive boss. Materials and silhouettes differ; gameplay archetypes, balance and the wire protocol stay stable.

The shared atlas is 3840×4032. Enemy quads retain the batched WebGL matrix path, with a Canvas fallback. Effects use a bounded pool and a cached texture atlas with +X authored forward. Continuous areas map their cached outlines to the actual server radius. Environment chunks are baked once, and raised furniture stays inside the original solid footprint.

## Direction and timing

The old slash texture faced left while code treated it as right. Ordinary attacks also re-read a changed facing at release, and their held-tool contact curve pointed sideways. The new geometry, captured windup angle and contact curve address those independently. Manual mouse aim now enters the same packet as the fire edge; automatic enemy search keeps its 25ms cadence. Q body and held-tool poses blend with the same weight.

Tests exercise eight rendered directions, actual grip error and damage, all human/enemy frames, continuous joints and real death fades. Enemy death preserves form first, then fades; checks observe scene postupdate events rather than guessing with a fixed delay.

See tests/browser-art40.ts, tests/art40-rig-audit.mjs, tests/browser-clarity.ts, tests/browser-feedback.ts and tests/browser-quiet-undead.ts. Curated results are in validation-4.0.json. Performance claims are limited to the measured conditions in PERFORMANCE-4.0.md.


性能实现补充 / Rendering budget: 角色关节、28职业工具、16模块工具及22类弹道共用同一图集；尾迹随弹体一张quad绘制，六类粒子合并到小图集。小血条使用八边斜角和直接三角形，避免每帧对圆角面板进行密集Earcut。未降低DPR、敌人数或压力阈值。


World HUD: full local numerical vitals, compact healthy-ally strips, critical/downed details and softly fading nearby healthy labels keep joint motion visible. Player down/revive root rotation now eases over time. README gameplay captures use a real local UI flow with one human client and three server bots, without state injection; annotated acceptance fixtures are separate.

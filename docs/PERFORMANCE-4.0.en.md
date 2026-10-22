# 4.0 performance verification

[中文](PERFORMANCE-4.0.md) · [Raw data](performance-4.0.json)

Measured during2026-10-22–23 with Windows Chromium, a1440×1000 viewport and DPR2. Counted actual WebGL render calls. Default headless reference was59.88Hz. Unrestricted experiments explicitly disable frame/vsync limits; this is not a production display guarantee.

| Complete stage | Main render FPS | Quiet render FPS | Original144 threshold |
|---|---:|---:|---|
| Initial integration |110.31|144.43|main failed|
| CPU profiler enabled |121.39|157.57|main failed; profiler overhead|
| Shared atlas/tails/beveled vitals |142.24|185.18|main failed|
| Direct triangle strips |177.02|201.31|both passed|
| Complete22-projectile material pass |132.77|167.20|main failed|
| Uniform bullet data/static radar cache |146.06|273.37|both passed|
| Shipping healthy-ally world-HUD refinement |209.20|306.85|both passed|

The final dense main sample ran6seconds/1256frames with8.50ms P95 frame interval; quiet view ran3seconds. The final ordinary144-target sample rendered143.64FPS with630.87RAF callbacks/sec; default display sample was59.65FPS. Samples fluctuate. An average passing result does not mean every frame or every device remains above144. All complete diagnostic stages are retained and are not a controlled statistical A/B study.

Dense fixture: one real browser plus three real Socket.IO peers, four modules each,100 continuously alive enemies, seed3900, DPR2. Artificially high enemy HP preserves load. No reduction to threshold, resolution, enemy count or joint cadence. This is not four physical computers or a long-duration public-network test.

Native verification explicitly checks a4.0.0 GAME_URL and playing phase. Current native environment:144Hz, DPR1,520×350,856frames/6seconds,142.61FPS and the same RAF rate. Opacity0.43/UI opacity1, pinning, click-through, tray restore and actual F9 resizing pass. An earlier DPR1.25 context measured57.82FPS without a captured display frequency; these are not a software A/B comparison. Native figures are not dense-fixture figures. Background browser PiP measured about59FPS and is not described as144FPS.

The renderer shares body/tool/projectile frames in3840×4032, combines payload/tail quads and particle textures, uses beveled primitives and direct ribbon topology, removes unused full-body uploads and duplicate rankings, caches static radar geometry, and normalizes bullet field creation. All joints and the transparent live board remain active.

Reproduce with BENCHMARK_UNCAPPED=1 FULL_ARSENAL=1 STRESS_MODULES=4 ENEMY_COUNT=100 STRESS_SEED=3900 and npm run test:stress. Normal display/target checks use npm run test:quality:local. Point GAME_URL at the matching server for npm run desktop:performance. Hardware, scaling, remote displays, background policies and power limits still affect results.

Local vitals retain full numbers/shields. Healthy allies use42px bars; critical/downed states retain full notices, and exact teammate HP stays in the party panel. This reduces clutter without dropping joints, effects or resolution.

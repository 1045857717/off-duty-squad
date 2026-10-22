# Paid Break Crew 4.1: readable interactions and a playable opening

Select the mode before assembling the squad. Early endless waves let players kill enemies and establish a build; later waves add stronger combinations, density and elites. Every interaction explains its target, cost and real result. Work mode keeps application-specific palettes.

## Endless progression

Wave 1 contains paper imps and crawling pursuers. Ranged enemies enter at wave 2, bombers at 3, heavy enemies and low-probability elites at 4, and ghosts at 6. Bosses remain every five waves. The base health coefficient starts at 0.70 and grows with wave, with additional growth beyond waves 4 and 10. Four-player opening health is 1.54 times solo and spawn frequency 1.84 times solo, one enemy per initial batch. Later party health scaling caps at 2.08 while base health and batch size continue to grow.

The previous base, party, wave and spawn multipliers stacked excessively on the first wave. Expedition keeps its existing balance; endless has its own curve. Late joining scales existing enemies with the current wave and historical peak party size, retaining their health fraction. Leaving does not reduce difficulty. Scarce healing/parts and the 16-second level interval remain.

## E interactions

The HUD and authoritative server share target selection: rescue and mission charging take priority, then the nearest supply or environmental tool. Holding E completes one action; release E before another action. Receipts never steal movement or fire input.

- Supply crates grant one pending three-option upgrade and show the 1/2/3 keys and exact shared-parts cost.
- Overtime shrines show the upgrade, health sacrifice and permanent enemy-pressure increase.
- Medical stations send each recipient their actual health and shield gains and can revive allies. An unneeded station is preserved.
- Printers lure nearby enemies for 8 seconds; they do not deal damage. Sprinklers slow enemies by 50% within a radius of 170 for 10 seconds.
- Cabinets and shutters report actual targets and damage, or explicitly report no hit. A teammate occupying the placement position prevents the barrier from being placed and is explained.

Behavioral regression tests cover real rewards, multiple recipients, capped supplies, target consistency, environmental tools, ordinary attacks for all 28 professions, continuous-hold prevention, late joining and early/late party pressure. Browser checks exercise keyboard interaction and real networking. Release verification records contain the executed results.

First-wave random events are selected from positive speed/fire-rate and supply events. Environmental events enter in wave 2, with the complete event pool from wave 3.

## Actual UI captures

![Mode-first lobby with co-op staging and adjacent chat](images/lobby.webp)

![Actual players and server AI in readiness](images/ready-41.webp)

![Individual interaction receipt](images/interaction-41.webp)

![Excel palette and editable cells](images/work-excel-41.webp)

The opening audit covers 28 professions × solo/four players × two common enemies, 112 cases. The slowest kill took 3.567 seconds with a stationary target already in ordinary-attack range, no random module, Q or critical hit. This is a controlled damage measure, not a chase-time or human-survival guarantee. See [raw cases and wave curves](balance-4.1.json).

Local acceptance:142core tests,5release-rule tests and12browser suites pass. Initial integration failures and fixes are retained in [validation-4.1.json](validation-4.1.json).

import type { EnemyKind } from "../../shared/types";
import type { RigGeometry } from "./joints";

/** Night-office oddities: flat stock, enamel, tarnished brass and dead office skin.
 * These paths run only when baking the atlas. The live rig still draws fifteen quads. */
export const OFFICE_INK = "#1b1a29";
const PAPER = "#e8d9b5",
  PAPER_SHADE = "#b5a68c",
  BRASS = "#b89a60",
  CORAL = "#e57e72",
  DARK = "#302c40",
  TEAL = "#719f93";
type Point = [number, number];
export type OfficePalette = {
  skin: string;
  shade: string;
  cloth: string;
  trim: string;
};

export function paintOfficeEnemy(
  c: CanvasRenderingContext2D,
  kind: EnemyKind,
  column: number,
  name: string,
  g: RigGeometry,
  d: OfficePalette,
) {
  const [rx, ry, rw, rh] = g.rect;
  const x = rx * 126,
    y = ry * 157.5,
    w = rw * 126,
    h = rh * 157.5;
  const back = column >= 3,
    side = column === 2;
  // The six columns share bounds; the visible face turns inside those bounds.
  const turn = side
    ? 0.18
    : column === 1 || column === 4
      ? 0.08
      : column === 5
        ? -0.08
        : 0;
  const planeWidth =
    name === "torso" ? (side ? 0.72 : turn ? 0.94 : 1) : side ? 0.88 : 1;
  const pt = (a: Point): Point => [
    x + (0.5 + (a[0] - 0.5) * planeWidth) * w,
    y + a[1] * h,
  ];
  const poly = (fill: string, points: Point[], stroke = OFFICE_INK) => {
    c.fillStyle = fill;
    c.strokeStyle = stroke;
    c.beginPath();
    points.forEach((q, i) => (i ? c.lineTo(...pt(q)) : c.moveTo(...pt(q))));
    c.closePath();
    c.fill();
    if (stroke) c.stroke();
  };
  const line = (stroke: string, points: Point[], width = 1.1) => {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.beginPath();
    points.forEach((q, i) => (i ? c.lineTo(...pt(q)) : c.moveTo(...pt(q))));
    c.stroke();
    c.lineWidth = 1.7;
  };
  const rect = (
    fill: string,
    a: number,
    b: number,
    width: number,
    height: number,
    stroke = OFFICE_INK,
  ) =>
    poly(
      fill,
      [
        [a, b],
        [a + width, b],
        [a + width, b + height],
        [a, b + height],
      ],
      stroke,
    );
  const oval = (
    fill: string,
    a: number,
    b: number,
    u: number,
    v: number,
    stroke = OFFICE_INK,
  ) => {
    c.fillStyle = fill;
    c.strokeStyle = stroke;
    c.beginPath();
    c.ellipse(x + a * w, y + b * h, u * w, v * h, 0, 0, Math.PI * 2);
    c.fill();
    if (stroke) c.stroke();
  };
  const label = (a: number, b: number, width: number) => {
    rect(PAPER, a, b, width, 0.085);
    line(
      PAPER_SHADE,
      [
        [a + width * 0.17, b + 0.043],
        [a + width * 0.73, b + 0.043],
      ],
      0.8,
    );
  };
  const vent = (a: number, b: number, width: number, count = 3) => {
    for (let i = 0; i < count; i++)
      line(
        OFFICE_INK,
        [
          [a, b + i * 0.055],
          [a + width, b + i * 0.055],
        ],
        1.2,
      );
  };
  c.lineWidth = 1.7;
  c.lineJoin = "bevel";
  c.lineCap = "round";

  if (name === "torso") {
    if (kind === "mite") {
      // A folded in-tray with an asymmetric, torn paper skirt, not a tiny man.
      poly(d.cloth, [
        [0.2, 0.07],
        [0.77, 0.07],
        [0.94, 0.31],
        [0.82, 0.73],
        [0.92, 0.91],
        [0.61, 0.83],
        [0.5, 0.96],
        [0.35, 0.82],
        [0.12, 0.94],
        [0.19, 0.65],
        [0.07, 0.3],
      ]);
      poly(
        d.shade,
        [
          [0.51, 0.12],
          [0.77, 0.07],
          [0.94, 0.31],
          [0.74, 0.82],
          [0.5, 0.96],
          [0.57, 0.51],
        ],
        "",
      );
      poly(PAPER, [
        [0.18, 0.21],
        [0.62, 0.14],
        [0.77, 0.52],
        [0.39, 0.69],
        [0.16, 0.55],
      ]);
      poly(
        PAPER_SHADE,
        [
          [0.62, 0.14],
          [0.77, 0.52],
          [0.39, 0.69],
          [0.48, 0.39],
        ],
        "",
      );
      line(
        BRASS,
        [
          [0.23, 0.29],
          [0.43, 0.26],
          [0.45, 0.4],
          [0.26, 0.44],
          [0.23, 0.29],
        ],
        1.8,
      );
      if (!back) {
        line(
          DARK,
          [
            [0.24, 0.5],
            [0.43, 0.45],
          ],
          1.2,
        );
        rect(CORAL, 0.27, 0.56, 0.18, 0.045, "");
      } else vent(0.36, 0.32, 0.24, 3);
      line(
        PAPER,
        [
          [0.23, 0.74],
          [0.35, 0.8],
          [0.3, 0.87],
        ],
        1,
      );
      return;
    }
    if (kind === "shooter" || kind === "tank") {
      const tank = kind === "tank";
      poly(d.cloth, [
        [0.08, 0.04],
        [0.81, 0.04],
        [0.94, 0.14],
        [0.94, 0.91],
        [0.83, 0.97],
        [0.1, 0.97],
        [0.04, 0.87],
        [0.04, 0.14],
      ]);
      poly(
        d.shade,
        [
          [0.79, 0.06],
          [0.94, 0.14],
          [0.94, 0.91],
          [0.81, 0.97],
          [0.79, 0.24],
        ],
        "",
      );
      line(
        d.trim,
        [
          [0.11, 0.09],
          [0.76, 0.09],
        ],
        1.3,
      );
      if (back || side) {
        rect(d.shade, 0.17, 0.24, 0.51, 0.57);
        vent(0.25, 0.33, 0.34, 5);
        label(0.23, 0.69, 0.28);
        line(
          BRASS,
          [
            [0.72, 0.24],
            [0.72, 0.81],
          ],
          1.6,
        );
        if (back)
          line(
            OFFICE_INK,
            [
              [0.28, 0.84],
              [0.23, 0.9],
              [0.4, 0.92],
            ],
            2.5,
          );
      } else if (tank) {
        for (let i = 0; i < 3; i++) {
          const top = 0.16 + i * 0.25;
          rect(i === 1 ? d.skin : d.shade, 0.13, top, 0.64, 0.22);
          label(0.22, top + 0.025, 0.25);
          line(
            BRASS,
            [
              [0.37, top + 0.14],
              [0.57, top + 0.14],
            ],
            2.2,
          );
          line(
            d.trim,
            [
              [0.17, top + 0.19],
              [0.69, top + 0.19],
            ],
            0.8,
          );
        }
        // A paper wedge jammed in the lowest drawer gives the block a human scale.
        poly(PAPER, [
          [0.62, 0.69],
          [0.78, 0.7],
          [0.8, 0.91],
          [0.68, 0.86],
        ]);
        line(
          PAPER_SHADE,
          [
            [0.7, 0.75],
            [0.75, 0.81],
          ],
          0.8,
        );
      } else {
        rect(PAPER, 0.12, 0.19, 0.68, 0.23);
        rect(OFFICE_INK, 0.18, 0.26, 0.55, 0.075, "");
        rect(TEAL, 0.22, 0.27, 0.18, 0.035, "");
        oval(CORAL, 0.7, 0.18, 0.028, 0.02, "");
        rect(DARK, 0.14, 0.47, 0.64, 0.34);
        poly(PAPER, [
          [0.23, 0.48],
          [0.66, 0.48],
          [0.71, 0.84],
          [0.59, 0.88],
          [0.48, 0.82],
          [0.36, 0.89],
          [0.24, 0.82],
        ]);
        line(
          PAPER_SHADE,
          [
            [0.31, 0.59],
            [0.59, 0.59],
          ],
          0.9,
        );
        line(
          PAPER_SHADE,
          [
            [0.31, 0.66],
            [0.55, 0.66],
          ],
          0.9,
        );
        line(
          CORAL,
          [
            [0.32, 0.75],
            [0.55, 0.75],
          ],
          1.5,
        );
        vent(0.83, 0.38, 0.05, 5);
      }
      return;
    }
    if (kind === "wraith") {
      // Empty meeting robe: a dark negative-space throat, clipped minutes, ribbon hem.
      poly(d.cloth, [
        [0.3, 0.05],
        [0.67, 0.05],
        [0.85, 0.21],
        [0.81, 0.54],
        [0.96, 0.9],
        [0.73, 0.82],
        [0.68, 0.97],
        [0.52, 0.85],
        [0.43, 0.96],
        [0.29, 0.83],
        [0.08, 0.91],
        [0.2, 0.53],
        [0.14, 0.22],
      ]);
      poly(
        d.shade,
        [
          [0.63, 0.09],
          [0.85, 0.21],
          [0.75, 0.58],
          [0.96, 0.9],
          [0.73, 0.82],
          [0.52, 0.85],
          [0.6, 0.49],
        ],
        "",
      );
      poly(DARK, [
        [0.35, 0.12],
        [0.62, 0.12],
        [0.58, 0.4],
        [0.5, 0.51],
        [0.4, 0.36],
      ]);
      if (!back) {
        poly(PAPER, [
          [0.24, 0.2],
          [0.37, 0.15],
          [0.42, 0.42],
          [0.31, 0.54],
          [0.23, 0.42],
        ]);
        poly(PAPER_SHADE, [
          [0.65, 0.16],
          [0.77, 0.23],
          [0.72, 0.48],
          [0.63, 0.42],
        ]);
        line(
          BRASS,
          [
            [0.32, 0.25],
            [0.51, 0.46],
            [0.68, 0.26],
          ],
          1.8,
        );
        rect(PAPER, 0.44, 0.47, 0.15, 0.14);
        rect(CORAL, 0.47, 0.5, 0.09, 0.035, "");
      } else {
        line(
          PAPER_SHADE,
          [
            [0.48, 0.14],
            [0.45, 0.55],
            [0.36, 0.75],
          ],
          1.2,
        );
        label(0.36, 0.29, 0.22);
      }
      line(
        d.trim,
        [
          [0.28, 0.59],
          [0.24, 0.72],
        ],
        1,
      );
      line(
        d.trim,
        [
          [0.61, 0.58],
          [0.69, 0.78],
        ],
        1,
      );
      return;
    }
    if (kind === "bomber") {
      // A squat espresso pressure vessel; the gauge and seam survive at gameplay size.
      poly(d.cloth, [
        [0.24, 0.04],
        [0.73, 0.04],
        [0.87, 0.16],
        [0.93, 0.51],
        [0.86, 0.85],
        [0.72, 0.96],
        [0.26, 0.96],
        [0.13, 0.84],
        [0.07, 0.51],
        [0.13, 0.17],
      ]);
      poly(
        d.shade,
        [
          [0.68, 0.08],
          [0.87, 0.16],
          [0.93, 0.51],
          [0.86, 0.85],
          [0.72, 0.96],
          [0.65, 0.7],
        ],
        "",
      );
      poly(
        BRASS,
        [
          [0.18, 0.2],
          [0.77, 0.2],
          [0.79, 0.28],
          [0.16, 0.28],
        ],
        OFFICE_INK,
      );
      poly(DARK, [
        [0.13, 0.67],
        [0.87, 0.67],
        [0.86, 0.8],
        [0.14, 0.8],
      ]);
      line(
        PAPER_SHADE,
        [
          [0.17, 0.34],
          [0.14, 0.55],
        ],
        1.4,
      );
      if (!back && !side) {
        oval(PAPER, 0.49, 0.46, 0.18, 0.16);
        line(
          CORAL,
          [
            [0.54, 0.33],
            [0.61, 0.38],
            [0.65, 0.43],
          ],
          2,
        );
        line(
          OFFICE_INK,
          [
            [0.49, 0.47],
            [0.56, 0.37],
          ],
          1.7,
        );
        oval(BRASS, 0.49, 0.47, 0.027, 0.023, "");
        rect(CORAL, 0.39, 0.71, 0.2, 0.035, "");
        label(0.35, 0.84, 0.28);
      } else {
        vent(0.27, 0.36, 0.31, 4);
        line(
          OFFICE_INK,
          [
            [0.58, 0.31],
            [0.68, 0.38],
            [0.65, 0.6],
            [0.55, 0.66],
          ],
          3.5,
        );
        line(
          TEAL,
          [
            [0.58, 0.31],
            [0.68, 0.38],
            [0.65, 0.6],
            [0.55, 0.66],
          ],
          1.4,
        );
      }
      return;
    }
    const boss = kind === "boss";
    // The crawler keeps its torn office shirt; the executive gets a huge tailored yoke.
    poly(
      d.cloth,
      boss
        ? [
            [0.07, 0.05],
            [0.92, 0.05],
            [0.96, 0.22],
            [0.75, 0.38],
            [0.71, 0.89],
            [0.57, 0.96],
            [0.48, 0.86],
            [0.29, 0.95],
            [0.24, 0.37],
            [0.04, 0.23],
          ]
        : [
            [0.17, 0.08],
            [0.76, 0.06],
            [0.91, 0.22],
            [0.77, 0.75],
            [0.84, 0.9],
            [0.59, 0.83],
            [0.48, 0.96],
            [0.37, 0.85],
            [0.15, 0.93],
            [0.23, 0.48],
            [0.08, 0.25],
          ],
    );
    poly(
      d.shade,
      [
        [0.56, 0.1],
        [0.76, 0.1],
        [0.78, 0.72],
        [0.66, 0.9],
        [0.51, 0.85],
      ],
      "",
    );
    if (back) {
      line(
        PAPER_SHADE,
        [
          [0.25, 0.24],
          [0.5, 0.3],
          [0.74, 0.22],
        ],
        0.9,
      );
      line(
        OFFICE_INK,
        [
          [0.51, 0.29],
          [0.49, 0.71],
          [0.59, 0.87],
        ],
        1.5,
      );
      poly(d.skin, [
        [0.33, 0.52],
        [0.52, 0.47],
        [0.56, 0.59],
        [0.42, 0.65],
      ]);
      line(
        OFFICE_INK,
        [
          [0.38, 0.55],
          [0.46, 0.57],
        ],
        1,
      );
    } else {
      poly(PAPER, [
        [0.3, 0.1],
        [0.48, 0.18],
        [0.42, 0.47],
        [0.24, 0.2],
      ]);
      poly(PAPER_SHADE, [
        [0.65, 0.09],
        [0.5, 0.18],
        [0.55, 0.45],
        [0.73, 0.2],
      ]);
      poly(boss ? BRASS : CORAL, [
        [0.49, 0.2],
        [0.55, 0.34],
        [0.52, 0.65],
        [0.46, 0.71],
        [0.45, 0.35],
      ]);
      if (boss) {
        line(
          BRASS,
          [
            [0.17, 0.14],
            [0.3, 0.14],
          ],
          2.5,
        );
        line(
          BRASS,
          [
            [0.71, 0.14],
            [0.85, 0.14],
          ],
          2.5,
        );
        label(0.59, 0.4, 0.15);
        // A rising KPI is the executive's insignia, engraved rather than text.
        line(
          BRASS,
          [
            [0.29, 0.61],
            [0.34, 0.55],
            [0.39, 0.58],
            [0.42, 0.5],
          ],
          1.5,
        );
      } else {
        poly(d.skin, [
          [0.63, 0.51],
          [0.76, 0.48],
          [0.72, 0.73],
          [0.6, 0.69],
        ]);
        line(
          OFFICE_INK,
          [
            [0.63, 0.57],
            [0.72, 0.55],
          ],
          1.2,
        );
        label(0.25, 0.37, 0.15);
      }
    }
    return;
  }

  if (name === "head") {
    const cx = 0.5 + turn;
    if (kind === "mite") {
      poly(PAPER, [
        [0.12, 0.32],
        [0.08, 0.06],
        [0.36, 0.18],
        [0.55, 0.07],
        [0.82, 0.19],
        [0.93, 0.07],
        [0.87, 0.48],
        [0.7, 0.83],
        [0.33, 0.88],
        [0.12, 0.64],
      ]);
      poly(
        PAPER_SHADE,
        [
          [0.55, 0.07],
          [0.82, 0.19],
          [0.87, 0.48],
          [0.7, 0.83],
          [0.48, 0.67],
          [0.56, 0.38],
        ],
        "",
      );
      line(
        BRASS,
        [
          [0.13, 0.32],
          [0.36, 0.28],
          [0.49, 0.45],
        ],
        1.1,
      );
      if (!back) {
        poly(
          OFFICE_INK,
          [
            [cx - 0.28, 0.43],
            [cx - 0.05, 0.47],
            [cx - 0.12, 0.57],
            [cx - 0.27, 0.55],
          ],
          "",
        );
        if (!side)
          poly(
            OFFICE_INK,
            [
              [cx + 0.06, 0.47],
              [cx + 0.26, 0.39],
              [cx + 0.26, 0.54],
              [cx + 0.12, 0.57],
            ],
            "",
          );
        rect(CORAL, cx - 0.2, 0.48, 0.085, 0.035, "");
        poly(
          DARK,
          [
            [cx - 0.18, 0.67],
            [cx + 0.15, 0.64],
            [cx + 0.11, 0.8],
            [cx - 0.1, 0.84],
          ],
          "",
        );
      } else
        line(
          DARK,
          [
            [0.3, 0.34],
            [0.58, 0.45],
            [0.67, 0.74],
          ],
          1.5,
        );
      return;
    }
    if (kind === "shooter") {
      poly(PAPER, [
        [0.12, 0.43],
        [0.13, 0.09],
        [0.61, 0.06],
        [0.76, 0.19],
        [0.81, 0.43],
        [0.94, 0.49],
        [0.9, 0.88],
        [0.13, 0.9],
        [0.06, 0.78],
        [0.06, 0.5],
      ]);
      poly(
        PAPER_SHADE,
        [
          [0.61, 0.06],
          [0.76, 0.19],
          [0.81, 0.43],
          [0.7, 0.52],
          [0.54, 0.47],
        ],
        "",
      );
      line(
        DARK,
        [
          [0.21, 0.19],
          [0.51, 0.18],
        ],
        1,
      );
      line(
        DARK,
        [
          [0.22, 0.29],
          [0.57, 0.28],
        ],
        1,
      );
      rect(d.cloth, 0.13, 0.49, 0.7, 0.28);
      if (!back) {
        rect(OFFICE_INK, 0.2 + turn * 0.3, 0.57, 0.49, 0.12, "");
        line(
          CORAL,
          [
            [0.25 + turn * 0.3, 0.61],
            [0.58 + turn * 0.3, 0.61],
          ],
          2,
        );
        rect(TEAL, 0.72, 0.52, 0.05, 0.05, "");
        // Toner leaks are deliberate solid marks, not noisy texture.
        poly(
          DARK,
          [
            [0.33, 0.69],
            [0.44, 0.69],
            [0.43, 0.85],
            [0.38, 0.8],
          ],
          "",
        );
      } else vent(0.25, 0.55, 0.38, 3);
      return;
    }
    if (kind === "tank") {
      poly(d.skin, [
        [0.24, 0.08],
        [0.71, 0.08],
        [0.83, 0.22],
        [0.8, 0.83],
        [0.62, 0.94],
        [0.25, 0.87],
        [0.16, 0.68],
        [0.16, 0.23],
      ]);
      poly(
        d.shade,
        [
          [0.66, 0.1],
          [0.83, 0.22],
          [0.8, 0.83],
          [0.62, 0.94],
          [0.6, 0.36],
        ],
        "",
      );
      rect(BRASS, 0.24, 0.15, 0.43, 0.12);
      if (!back) {
        rect(OFFICE_INK, 0.24 + turn * 0.3, 0.39, 0.44, 0.14, "");
        rect(CORAL, 0.31 + turn * 0.3, 0.43, 0.2, 0.04, "");
        line(
          PAPER_SHADE,
          [
            [0.26, 0.63],
            [0.58, 0.63],
          ],
          1,
        );
        oval(BRASS, 0.65, 0.7, 0.04, 0.035);
      } else {
        vent(0.27, 0.39, 0.33, 3);
        label(0.29, 0.69, 0.3);
      }
      return;
    }
    if (kind === "wraith") {
      poly(d.skin, [
        [0.48, 0.04],
        [0.71, 0.11],
        [0.84, 0.4],
        [0.77, 0.7],
        [0.86, 0.92],
        [0.63, 0.83],
        [0.49, 0.94],
        [0.35, 0.83],
        [0.15, 0.9],
        [0.22, 0.63],
        [0.15, 0.42],
        [0.29, 0.14],
      ]);
      poly(
        d.shade,
        [
          [0.48, 0.04],
          [0.71, 0.11],
          [0.84, 0.4],
          [0.77, 0.7],
          [0.86, 0.92],
          [0.63, 0.83],
          [0.55, 0.59],
        ],
        "",
      );
      if (!back) {
        poly(DARK, [
          [cx - 0.17, 0.26],
          [cx + 0.11, 0.24],
          [cx + 0.2, 0.45],
          [cx + 0.12, 0.74],
          [cx - 0.15, 0.76],
          [cx - 0.24, 0.49],
        ]);
        line(
          PAPER,
          [
            [cx - 0.14, 0.42],
            [cx - 0.04, 0.45],
          ],
          1.7,
        );
        if (!side)
          line(
            PAPER,
            [
              [cx + 0.04, 0.44],
              [cx + 0.13, 0.4],
            ],
            1.7,
          );
        poly(
          OFFICE_INK,
          [
            [cx - 0.1, 0.59],
            [cx + 0.09, 0.57],
            [cx + 0.05, 0.76],
            [cx - 0.07, 0.77],
          ],
          "",
        );
      } else
        line(
          PAPER_SHADE,
          [
            [0.47, 0.19],
            [0.42, 0.43],
            [0.48, 0.71],
          ],
          1.2,
        );
      return;
    }
    if (kind === "bomber") {
      // Lever and steam valve make the head read as a machine even in profile.
      rect(OFFICE_INK, 0.39, 0.07, 0.23, 0.13);
      poly(BRASS, [
        [0.45, 0.16],
        [0.69, 0.16],
        [0.73, 0.26],
        [0.57, 0.3],
        [0.43, 0.25],
      ]);
      poly(d.cloth, [
        [0.17, 0.36],
        [0.72, 0.3],
        [0.88, 0.45],
        [0.81, 0.72],
        [0.65, 0.86],
        [0.27, 0.86],
        [0.12, 0.68],
        [0.1, 0.47],
      ]);
      poly(
        d.shade,
        [
          [0.67, 0.32],
          [0.88, 0.45],
          [0.81, 0.72],
          [0.65, 0.86],
          [0.6, 0.53],
        ],
        "",
      );
      line(
        PAPER,
        [
          [0.2, 0.42],
          [0.49, 0.38],
        ],
        1.6,
      );
      if (!back) {
        rect(DARK, 0.22 + turn * 0.2, 0.48, 0.48, 0.15);
        line(
          CORAL,
          [
            [0.29 + turn * 0.2, 0.54],
            [0.51 + turn * 0.2, 0.54],
          ],
          1.6,
        );
        rect(BRASS, 0.41 + turn * 0.3, 0.66, 0.18, 0.13);
      } else vent(0.26, 0.47, 0.31, 3);
      return;
    }
    const boss = kind === "boss";
    poly(d.skin, [
      [0.28, 0.19],
      [0.65, 0.14],
      [0.79, 0.3],
      [0.82, 0.59],
      [0.67, 0.86],
      [0.42, 0.92],
      [0.22, 0.73],
      [0.16, 0.4],
    ]);
    poly(
      d.shade,
      [
        [0.62, 0.17],
        [0.79, 0.3],
        [0.82, 0.59],
        [0.67, 0.86],
        [0.53, 0.82],
        [0.59, 0.5],
      ],
      "",
    );
    poly(DARK, [
      [0.19, 0.4],
      [0.22, 0.2],
      [0.41, 0.13],
      [0.6, 0.17],
      [0.74, 0.11],
      [0.79, 0.33],
      [0.64, 0.3],
      [0.5, 0.35],
      [0.4, 0.27],
      [0.29, 0.4],
    ]);
    if (boss) {
      // A clipped bar-chart crown replaces a generic fantasy crown.
      poly(BRASS, [
        [0.23, 0.21],
        [0.22, 0.06],
        [0.35, 0.06],
        [0.35, 0.14],
        [0.45, 0.14],
        [0.45, 0.055],
        [0.56, 0.055],
        [0.56, 0.12],
        [0.66, 0.12],
        [0.66, 0.065],
        [0.76, 0.065],
        [0.75, 0.24],
      ]);
      line(
        PAPER,
        [
          [0.3, 0.19],
          [0.68, 0.19],
        ],
        1,
      );
    }
    if (!back) {
      const eye = (a: number) => {
        poly(
          OFFICE_INK,
          [
            [a - 0.09, 0.44],
            [a + 0.085, 0.46],
            [a + 0.07, 0.55],
            [a - 0.08, 0.55],
          ],
          "",
        );
        rect(boss ? BRASS : PAPER, a - 0.025, 0.48, 0.045, 0.025, "");
      };
      eye(cx - 0.13);
      if (!side) eye(cx + 0.13);
      if (boss)
        line(
          BRASS,
          [
            [cx - 0.22, 0.43],
            [cx + 0.22, 0.43],
          ],
          1.1,
        );
      poly(
        d.shade,
        [
          [cx + 0.01, 0.5],
          [cx + 0.11, 0.65],
          [cx - 0.015, 0.66],
        ],
        "",
      );
      poly(
        DARK,
        [
          [cx - 0.18, 0.69],
          [cx - 0.07, 0.64],
          [cx + 0.12, 0.71],
          [cx + 0.09, 0.86],
          [cx - 0.1, 0.87],
        ],
        "",
      );
      line(
        PAPER,
        [
          [cx - 0.17, 0.63],
          [cx - 0.12, 0.67],
        ],
        1.6,
      );
      line(
        CORAL,
        [
          [cx - 0.2, 0.58],
          [cx - 0.16, 0.69],
        ],
        1.1,
      );
    } else {
      line(
        d.trim,
        [
          [0.3, 0.43],
          [0.33, 0.65],
        ],
        1.2,
      );
      line(
        OFFICE_INK,
        [
          [0.48, 0.36],
          [0.58, 0.43],
        ],
        1.1,
      );
    }
    return;
  }
  if (name === "jaw") {
    // Every direction has a real jaw/lid/valve frame, including the rear hinge.
    if (back) {
      rect(d.shade, 0.24, 0.37, 0.5, 0.23);
      line(
        d.trim,
        [
          [0.35, 0.48],
          [0.64, 0.48],
        ],
        1.2,
      );
    } else if (kind === "shooter") {
      poly(d.skin, [
        [0.08, 0.24],
        [0.84, 0.24],
        [0.91, 0.65],
        [0.72, 0.84],
        [0.19, 0.83],
        [0.1, 0.65],
      ]);
      rect(DARK, 0.21, 0.4, 0.53, 0.14, "");
      line(
        CORAL,
        [
          [0.28, 0.48],
          [0.64, 0.48],
        ],
        1.5,
      );
      poly(PAPER, [
        [0.3, 0.58],
        [0.63, 0.58],
        [0.66, 0.91],
        [0.51, 0.85],
        [0.42, 0.94],
        [0.32, 0.86],
      ]);
    } else if (kind === "tank") {
      rect(d.shade, 0.16, 0.26, 0.65, 0.5);
      label(0.27, 0.37, 0.38);
      line(
        BRASS,
        [
          [0.36, 0.68],
          [0.62, 0.68],
        ],
        1.6,
      );
    } else if (kind === "bomber") {
      rect(DARK, 0.2, 0.21, 0.58, 0.27);
      rect(BRASS, 0.38, 0.43, 0.24, 0.4);
      line(
        PAPER,
        [
          [0.43, 0.47],
          [0.43, 0.7],
        ],
        1.1,
      );
      rect(CORAL, 0.4, 0.78, 0.19, 0.07, "");
    } else if (kind === "wraith") {
      poly(d.shade, [
        [0.12, 0.22],
        [0.43, 0.4],
        [0.84, 0.17],
        [0.74, 0.68],
        [0.53, 0.9],
        [0.34, 0.73],
        [0.21, 0.87],
      ]);
      line(
        PAPER,
        [
          [0.32, 0.54],
          [0.48, 0.61],
          [0.67, 0.46],
        ],
        1.4,
      );
    } else {
      poly(kind === "mite" ? PAPER_SHADE : d.skin, [
        [0.1, 0.22],
        [0.85, 0.19],
        [0.82, 0.63],
        [0.59, 0.86],
        [0.24, 0.74],
      ]);
      for (let i = 0; i < 4; i++)
        rect(PAPER, 0.22 + i * 0.14, 0.25, 0.075, 0.22 - (i % 2) * 0.06, "");
      line(
        kind === "mite" ? CORAL : d.shade,
        [
          [0.23, 0.65],
          [0.62, 0.72],
        ],
        1.3,
      );
    }
    return;
  }

  const a: Point = [g.pivot[0] * 126, g.pivot[1] * 157.5],
    b: Point = [g.tip![0] * 126, g.tip![1] * 157.5],
    r = g.radius! * 126,
    len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const hand = name.endsWith("Hand"),
    foot = name.endsWith("Foot"),
    fore = name.endsWith("Forearm"),
    arm = name.includes("Arm"),
    mechanical = kind === "tank" || kind === "shooter" || kind === "bomber";
  c.save();
  c.translate(...a);
  c.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2);
  const limbPoly = (fill: string, points: Point[], stroke = OFFICE_INK) => {
    c.fillStyle = fill;
    c.strokeStyle = stroke;
    c.beginPath();
    points.forEach((q, i) =>
      i ? c.lineTo(q[0] * r, q[1]) : c.moveTo(q[0] * r, q[1]),
    );
    c.closePath();
    c.fill();
    if (stroke) c.stroke();
  };
  const seam = (
    color: string,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    width = 1,
  ) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(ax * r, ay);
    c.lineTo(bx * r, by);
    c.stroke();
    c.lineWidth = 1.7;
  };
  if (kind === "mite") {
    limbPoly(hand || foot ? PAPER : d.cloth, [
      [-0.7, -r * 0.25],
      [0.55, -r * 0.3],
      [0.95, len * 0.42],
      [0.6, len + r * 0.65],
      [0, len + r * 0.2],
      [-0.85, len + r * 0.6],
      [-0.55, len * 0.4],
    ]);
    limbPoly(
      PAPER_SHADE,
      [
        [0.15, 0],
        [0.55, -r * 0.3],
        [0.95, len * 0.42],
        [0.6, len + r * 0.65],
        [0, len + r * 0.2],
      ],
      "",
    );
    seam(BRASS, -0.4, len * 0.3, 0.5, len * 0.55, 1.1);
  } else if (kind === "wraith") {
    limbPoly(foot ? PAPER_SHADE : d.skin, [
      [-0.7, -r * 0.3],
      [0.6, -r * 0.35],
      [0.83, len * 0.48],
      [0.5, len + r * 0.8],
      [0, len + r * 0.2],
      [-0.7, len + r * 0.65],
      [-0.42, len * 0.4],
    ]);
    limbPoly(
      d.shade,
      [
        [0.12, 0],
        [0.6, -r * 0.35],
        [0.83, len * 0.48],
        [0.5, len + r * 0.8],
        [0, len + r * 0.2],
      ],
      "",
    );
    seam(PAPER, -0.34, len * 0.18, -0.17, len * 0.68, 1.1);
    if (hand) seam(CORAL, -0.35, len * 0.8, 0.36, len * 0.75, 1.1);
  } else if (mechanical && foot && kind === "shooter") {
    // Casters give the printer its own locomotion material, without adding bones.
    limbPoly(d.cloth, [
      [-0.35, -r * 0.2],
      [0.35, -r * 0.2],
      [0.4, len],
      [-0.4, len],
    ]);
    c.fillStyle = DARK;
    c.strokeStyle = OFFICE_INK;
    c.beginPath();
    c.ellipse(0, len + r * 0.15, r * 0.7, r * 0.7, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    seam(BRASS, -0.3, len + r * 0.15, 0.3, len + r * 0.15, 1.5);
  } else if (mechanical) {
    const fill = hand
      ? kind === "tank"
        ? d.skin
        : d.shade
      : foot
        ? DARK
        : d.cloth;
    limbPoly(fill, [
      [-0.65, -r * 0.45],
      [0.62, -r * 0.45],
      [0.93, r * 0.05],
      [0.92, len + r * 0.48],
      [0.5, len + r * 0.74],
      [-0.78, len + r * 0.52],
      [-0.91, r * 0.12],
    ]);
    limbPoly(
      d.shade,
      [
        [0.36, -r * 0.2],
        [0.62, -r * 0.45],
        [0.93, r * 0.05],
        [0.92, len + r * 0.48],
        [0.5, len + r * 0.74],
      ],
      "",
    );
    seam(d.trim, -0.63, len * 0.18, 0.64, len * 0.18, 1.4);
    seam(d.trim, -0.62, len * 0.78, 0.56, len * 0.78, 1);
    if (hand && kind === "tank") {
      // Drawer handles make the heavy fists read independently of the torso.
      seam(BRASS, -0.44, len * 0.47, 0.45, len * 0.47, 2);
      seam(PAPER, -0.34, len * 0.12, 0.17, len * 0.12, 0.8);
    } else if (fore || arm) {
      c.fillStyle = BRASS;
      c.beginPath();
      c.arc(0, 1, Math.max(1.2, r * 0.27), 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = OFFICE_INK;
      c.stroke();
      seam(DARK, -0.37, len * 0.4, 0.42, len * 0.4, 1.1);
    } else if (foot)
      seam(PAPER_SHADE, -0.61, len + r * 0.35, 0.55, len + r * 0.35, 0.9);
  } else {
    const bare = hand || fore;
    limbPoly(bare ? d.skin : foot ? DARK : d.cloth, [
      [-0.7, -r * 0.4],
      [0.5, -r * 0.45],
      [0.84, len * 0.23],
      [0.67, len + r * 0.54],
      [-0.1, len + r * 0.7],
      [-0.78, len + r * 0.4],
      [-0.6, len * 0.3],
    ]);
    limbPoly(
      d.shade,
      [
        [0.2, -r * 0.2],
        [0.5, -r * 0.45],
        [0.84, len * 0.23],
        [0.67, len + r * 0.54],
        [0.13, len + r * 0.6],
      ],
      "",
    );
    if (hand) {
      for (let i = 0; i < 3; i++)
        seam(
          PAPER,
          -0.4 + i * 0.35,
          len * 0.57,
          -0.48 + i * 0.43,
          len + r * 0.5,
          1.2,
        );
    } else if (fore) {
      seam(PAPER, -0.46, len * 0.35, 0.22, len * 0.5, 1.6);
      seam(CORAL, -0.35, len * 0.58, 0.29, len * 0.65, 1);
    } else if (foot) seam(BRASS, -0.55, len + r * 0.35, 0.5, len + r * 0.35, 1);
    else {
      seam(
        kind === "boss" ? BRASS : PAPER_SHADE,
        -0.55,
        len * 0.8,
        0.5,
        len * 0.74,
        1.2,
      );
      if (kind === "hound")
        limbPoly(
          d.skin,
          [
            [-0.7, len * 0.4],
            [-0.08, len * 0.5],
            [-0.45, len * 0.71],
          ],
          "",
        );
    }
  }
  c.restore();
}

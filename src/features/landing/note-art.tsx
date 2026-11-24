/**
 * Stylised rupee banknote artwork for the landing hero, drawn once as SVG symbols and reused
 * by every falling note via <use>. Generic design (₹ glyph, guilloche lines, numeral, wordmark):
 * no real currency artwork. Two shapes (flat and curled) × three palettes built only from the
 * design-system palette tokens (paper greys, flame and ember oranges). Colours are applied through
 * inline `style` so the `var(--palette-*)` custom properties resolve (SVG attributes can't use var()).
 */

export const NOTE_W = 150;
export const NOTE_H = 72;

const PALETTES = [
  { light: "var(--palette-canvas)", mid: "var(--palette-mist)", dark: "var(--palette-silver)", ink: "var(--palette-graphite)" }, // paper
  { light: "var(--palette-mist)", mid: "var(--palette-flame)", dark: "var(--palette-ember)", ink: "var(--palette-ink)" }, // flame
  { light: "var(--palette-flame)", mid: "var(--palette-ember)", dark: "var(--palette-ember)", ink: "var(--palette-ink)" }, // ember
] as const;

/** Curl amplitude per shape: 0 = flat, 7 = curled like a note caught in the air. */
const SHAPES = [0, 7] as const;

export const NOTE_SYMBOL_COUNT = PALETTES.length * SHAPES.length;

export function noteSymbolId(index: number): string {
  return `ln-note-${index}`;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Vertical offset of the S-curve at x (cubic Bézier with evenly spaced control points). */
function curve(x: number, amp: number): number {
  const t = x / NOTE_W;
  return 3 * amp * t * (1 - t) * (2 * t - 1);
}

/** Local slope of the curve at x, in degrees, so text can sit along the curl. */
function slope(x: number, amp: number): number {
  const t = x / NOTE_W;
  const dydt = 3 * amp * (-((2 * t - 1) ** 2) + 2 * t - 2 * t * t);
  return round((Math.atan(dydt / NOTE_W) * 180) / Math.PI);
}

function edge(y: number, amp: number, x0 = 0, x1 = NOTE_W, step = 5): string[] {
  const points: string[] = [];
  for (let x = x0; x <= x1 + 0.001; x += step) points.push(`${round(x)},${round(y + curve(x, amp))}`);
  return points;
}

function outline(top: number, bottom: number, amp: number, inset = 0): string {
  const upper = edge(top, amp, inset, NOTE_W - inset);
  const lower = edge(bottom, amp, inset, NOTE_W - inset).reverse();
  return `M${upper.join(" L")} L${lower.join(" L")} Z`;
}

/** Note silhouette per shape; also used as the clip-path of the shading overlay (px units). */
export const NOTE_BODY_PATHS = SHAPES.map((amp) => outline(2, 70, amp));

function guilloche(y: number, amp: number, phase: number): string {
  const points: string[] = [];
  for (let x = 44; x <= 98; x += 2) points.push(`${x},${round(y + curve(x, amp) + 1.8 * Math.sin((x + phase) / 4.5))}`);
  return `M${points.join(" L")}`;
}

function Label({ x, y, amp, children, ...props }: { x: number; y: number; amp: number; children: string } & React.SVGProps<SVGTextElement>) {
  const cy = round(y + curve(x, amp));
  return (
    <text x={x} y={cy} transform={`rotate(${slope(x, amp)} ${x} ${cy})`} {...props}>
      {children}
    </text>
  );
}

/** Hidden SVG with the gradients and note symbols. Render once per page. */
export function NoteSymbols() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        {PALETTES.map((p, i) => (
          <linearGradient key={i} id={`ln-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: p.light }} />
            <stop offset="55%" style={{ stopColor: p.mid }} />
            <stop offset="100%" style={{ stopColor: p.dark }} />
          </linearGradient>
        ))}
        {PALETTES.flatMap((p, pi) =>
          SHAPES.map((amp, si) => {
            const index = pi * SHAPES.length + si;
            const threadTop = round(2 + curve(102, amp));
            const threadBottom = round(70 + curve(102, amp));
            const sealY = round(36 + curve(116, amp));
            return (
              <symbol key={index} id={noteSymbolId(index)} viewBox={`0 0 ${NOTE_W} ${NOTE_H}`}>
                <path d={NOTE_BODY_PATHS[si]} fill={`url(#ln-grad-${pi})`} />
                <path d={outline(7, 65, amp, 7)} fill="none" style={{ stroke: p.ink }} strokeOpacity={0.35} strokeWidth={0.7} />
                {[22, 30, 42, 50].map((y, k) => (
                  <path key={y} d={guilloche(y, amp, k * 7)} fill="none" style={{ stroke: p.ink }} strokeOpacity={0.2} strokeWidth={0.5} />
                ))}
                <line x1={102} y1={threadTop} x2={102} y2={threadBottom} style={{ stroke: p.ink }} strokeOpacity={0.25} strokeWidth={1.4} strokeDasharray="3 2" />
                <circle cx={116} cy={sealY} r={15} style={{ fill: p.light, stroke: p.ink }} fillOpacity={0.5} strokeOpacity={0.35} strokeWidth={0.8} />
                <Label x={116} y={36} amp={amp} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={600} style={{ fill: p.ink }} fillOpacity={0.7}>
                  ₹
                </Label>
                <Label x={13} y={22} amp={amp} fontSize={14} fontWeight={600} style={{ fill: p.ink }} fillOpacity={0.6}>
                  500
                </Label>
                <Label x={13} y={61} amp={amp} fontSize={7} fontWeight={600} style={{ fill: p.ink }} fillOpacity={0.5}>
                  500
                </Label>
                <Label x={71} y={61} amp={amp} textAnchor="middle" fontSize={6} fontWeight={600} style={{ fill: p.ink }} fillOpacity={0.45}>
                  expenses.
                </Label>
              </symbol>
            );
          }),
        )}
      </defs>
    </svg>
  );
}

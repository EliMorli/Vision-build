import { View } from "react-native";
import Svg, { Polygon, Circle, Rect, Path, G } from "react-native-svg";

// ─── Isometric utility functions ───────────────────────────

const P = (u: number, v: number): [number, number] => [
  100 + u - v,
  52 + (u + v) * 0.5,
];

const pt = (points: [number, number][]): string =>
  points.map(p => p.join(',')).join(' ');

const up = (p: [number, number], h: number): [number, number] => [p[0], p[1] - h];

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = num >> 16;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const f = (x: number) => Math.max(0, Math.min(255, Math.round(x + (percent / 100) * 255)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function box(
  u: number,
  v: number,
  w: number,
  d: number,
  h: number,
  color: string
): string {
  const a = P(u, v);
  const b = P(u + w, v);
  const c = P(u + w, v + d);
  const dd = P(u, v + d);

  const right = `<polygon points="${pt([b, c, up(c, h), up(b, h)])}" fill="${shade(color, -14)}"/>`;
  const left = `<polygon points="${pt([dd, c, up(c, h), up(dd, h)])}" fill="${shade(color, -26)}"/>`;
  const top = `<polygon points="${pt([up(a, h), up(b, h), up(c, h), up(dd, h)])}" fill="${shade(color, 10)}"/>`;

  return right + left + top;
}

// ─── Palette definitions ───────────────────────────────────

export interface RoomPalette {
  wallL: string;
  wallR: string;
  floor: string;
  sofa: string;
  rug: string;
  accent: string;
  plant: string;
}

export const PALETTES: Record<string, RoomPalette> = {
  modern: {
    wallL: '#E8ECF3',
    wallR: '#F5F7FB',
    floor: '#C9CED8',
    sofa: '#3E4A61',
    rug: '#FFFFFF',
    accent: '#1A73E8',
    plant: '#3FAF6A',
  },
  farmhouse: {
    wallL: '#F2E6D3',
    wallR: '#FBF3E6',
    floor: '#C08A55',
    sofa: '#EFE5D2',
    rug: '#B9573F',
    accent: '#7A5233',
    plant: '#5E9A55',
  },
  coastal: {
    wallL: '#DDEFF7',
    wallR: '#EEF8FC',
    floor: '#E8D9BE',
    sofa: '#FFFFFF',
    rug: '#7FC4E0',
    accent: '#2E86C1',
    plant: '#4CB47A',
  },
  industrial: {
    wallL: '#B5654A',
    wallR: '#C5775C',
    floor: '#6E6E73',
    sofa: '#3A2F2A',
    rug: '#8C8C92',
    accent: '#F2A33A',
    plant: '#4E8C5A',
  },
  luxury: {
    wallL: '#2D2A3E',
    wallR: '#3A3650',
    floor: '#EDE7DC',
    sofa: '#6B4FA3',
    rug: '#D9B65A',
    accent: '#D9B65A',
    plant: '#3E8F64',
  },
  scandinavian: {
    wallL: '#F4F1EC',
    wallR: '#FBF9F6',
    floor: '#E3CFAF',
    sofa: '#C9CFD6',
    rug: '#F0EDE6',
    accent: '#E9A88E',
    plant: '#6FAF7A',
  },
  midcentury: {
    wallL: '#E8D3B0',
    wallR: '#F3E2C4',
    floor: '#9A6A3F',
    sofa: '#2E8C7E',
    rug: '#E07A3F',
    accent: '#E0B13F',
    plant: '#4F9A5B',
  },
  transitional: {
    wallL: '#D8D2C8',
    wallR: '#E4DFD6',
    floor: '#B59B7C',
    sofa: '#8C8C8C',
    rug: '#C9B9A3',
    accent: '#9A8F80',
    plant: '#7E9B6E',
  },
};

// ─── Main component ────────────────────────────────────────

interface IsoRoomProps {
  palette: string;
  size?: number;
  spark?: boolean;
  accessibilityLabel?: string;
  accessible?: boolean;
  importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";
  testID?: string;
}

export function IsoRoom({
  palette: paletteKey = "modern",
  size = 200,
  spark = false,
  accessibilityLabel,
  accessible = true,
  importantForAccessibility,
  testID,
}: IsoRoomProps) {
  const pal = PALETTES[paletteKey] || PALETTES.modern;
  const { wallL, wallR, floor, sofa, rug, accent, plant } = pal;

  const T = P(0, 0);
  const R = P(84, 0);
  const L = P(0, 84);
  const B = P(84, 84);
  const H = 62;

  // Window on right wall
  const w1 = P(30, 0);
  const w2 = P(60, 0);

  // Art on left wall
  const a1 = P(0, 26);
  const a2 = P(0, 50);

  // Rug corners
  const r1 = P(22, 24);
  const r2 = P(66, 24);
  const r3 = P(66, 64);
  const r4 = P(22, 64);

  // Lamp position
  const lp = P(6, 62);

  // Plant circle
  const pc = up(P(69, 13), 24);

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={importantForAccessibility}
      aria-hidden={!accessible}
      testID={testID}
    >
      <Svg width={size} height={size * 0.8} viewBox="0 -14 200 160">
        {/* Left wall */}
        <Polygon points={pt([L, T, up(T, H), up(L, H)])} fill={wallL} />

        {/* Right wall */}
        <Polygon points={pt([T, R, up(R, H), up(T, H)])} fill={wallR} />

        {/* Window on right wall */}
        <Polygon
          points={pt([up(w1, 18), up(w2, 18), up(w2, 48), up(w1, 48)])}
          fill="#CFEAFF"
          stroke="#fff"
          strokeWidth="3"
        />

        {/* Art on left wall */}
        <Polygon
          points={pt([up(a1, 26), up(a2, 26), up(a2, 46), up(a1, 46)])}
          fill={accent}
          stroke="#fff"
          strokeWidth="2.5"
        />

        {/* Floor */}
        <Polygon points={pt([T, R, B, L])} fill={floor} />

        {/* Floor thickness */}
        <Polygon
          points={pt([L, B, [B[0], B[1] + 7], [L[0], L[1] + 7]])}
          fill={shade(floor, -22)}
        />
        <Polygon
          points={pt([B, R, [R[0], R[1] + 7], [B[0], B[1] + 7]])}
          fill={shade(floor, -12)}
        />

        {/* Rug */}
        <Polygon points={pt([r1, r2, r3, r4])} fill={rug} />

        {/* Sofa (using dangerouslySetInnerHTML equivalent for SVG string) */}
        <G dangerouslySetInnerHTML={{ __html: box(8, 6, 46, 16, 10, sofa) }} />
        <G dangerouslySetInnerHTML={{ __html: box(8, 6, 46, 6, 22, sofa) }} />
        <G dangerouslySetInnerHTML={{ __html: box(8, 6, 6, 16, 16, sofa) }} />
        <G dangerouslySetInnerHTML={{ __html: box(48, 6, 6, 16, 16, sofa) }} />

        {/* Coffee table */}
        <G dangerouslySetInnerHTML={{ __html: box(30, 36, 20, 14, 9, accent) }} />

        {/* Plant pot */}
        <G dangerouslySetInnerHTML={{ __html: box(64, 8, 10, 10, 12, '#E9DCCB') }} />
        <Circle cx={pc[0]} cy={pc[1]} r="11" fill={plant} />
        <Circle cx={pc[0] - 6} cy={pc[1] + 3} r="7" fill={shade(plant, -10)} />

        {/* Lamp */}
        <Rect
          x={lp[0] - 1.5}
          y={lp[1] - 40}
          width="3"
          height="40"
          fill="#555"
        />
        <Path
          d={`M${lp[0] - 9},${lp[1] - 38} ${lp[0] + 9},${lp[1] - 38} ${lp[0] + 5},${lp[1] - 50} ${lp[0] - 5},${lp[1] - 50}Z`}
          fill="#FFD66B"
        />

        {/* Optional sparkles */}
        {spark && (
          <G fill="#FBBC04">
            <Path d="M176 4l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
            <Path d="M22 0l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
          </G>
        )}
      </Svg>
    </View>
  );
}

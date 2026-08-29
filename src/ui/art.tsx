/**
 * art.tsx — the hand-drawn sprite library.
 *
 * NO platform emoji anywhere in the game: every creature, plant, object,
 * trader and UI glyph is an original cartoony vector in a shared style —
 * fat rounded shapes, warm ink outline, flat fills, dot eyes with a white
 * speck. All sprites live in a 64×64 box, anchored bottom-centre when
 * placed in the scene.
 *
 * Swapping art styles later = editing this one file.
 */
import type { JSX } from 'react';

/* ── shared ink & palette (design-system ink) ─────────────────────── */
const INK = '#57422e';
const S = 2.6; // outline width

const eye = (cx: number, cy: number, r = 2.6) => (
  <>
    <circle cx={cx} cy={cy} r={r} fill={INK} />
    <circle cx={cx + r * 0.35} cy={cy - r * 0.35} r={r * 0.32} fill="#fff" />
  </>
);

const blush = (cx: number, cy: number) => <ellipse cx={cx} cy={cy} rx={3.4} ry={2} fill="#f2a48d" opacity={0.55} />;

type O = { fill?: string };
const out = (o?: O) => ({ stroke: INK, strokeWidth: S, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const, ...o });

/* ── creatures ────────────────────────────────────────────────────── */

const sparrow = (
  <g>
    <path d="M14 40c0-12 9-20 20-20s18 8 18 19c0 10-8 17-19 17S14 51 14 40Z" fill="#b98d62" {...out()} />
    <path d="M33 21c8-1 16 3 18 10-6 2-14 1-18-3" fill="#8a6544" stroke="none" />
    <path d="M12 42c-4 2-7 6-7 10 5 0 10-2 12-6" fill="#8a6544" {...out()} />
    <path d="M24 38c4 5 12 5 16 0" fill="#f0e0c8" stroke="none" />
    <path d="M50 34l8 3-8 3" fill="#e8a13f" {...out({ fill: '#e8a13f' })} />
    {eye(40, 32)}
    <path d="M26 56l3-5M34 56l2-5" {...out()} fill="none" />
  </g>
);

const honeybee = (
  <g>
    <ellipse cx={24} cy={20} rx={11} ry={8} fill="#cfe7f2" opacity={0.9} {...out({ fill: '#cfe7f2' })} />
    <ellipse cx={44} cy={18} rx={10} ry={7} fill="#cfe7f2" opacity={0.9} {...out({ fill: '#cfe7f2' })} />
    <ellipse cx={32} cy={40} rx={19} ry={14} fill="#f4c14d" {...out()} />
    <path d="M24 27v26M33 26v28M42 28v24" stroke={INK} strokeWidth={5} strokeLinecap="round" />
    <ellipse cx={32} cy={40} rx={19} ry={14} fill="none" {...out()} />
    {eye(22, 37)}
    <path d="M51 40l6 2" {...out()} />
    {blush(24, 45)}
  </g>
);

const cabbage_butterfly = (
  <g>
    <path d="M30 34C20 18 8 16 6 26c-2 9 8 16 20 15" fill="#fdf6e4" {...out()} />
    <path d="M34 34c10-16 22-18 24-8 2 9-8 16-20 15" fill="#fdf6e4" {...out()} />
    <circle cx={16} cy={26} r={3.4} fill="#8fb573" />
    <circle cx={48} cy={26} r={3.4} fill="#8fb573" />
    <rect x={28.5} y={26} width={7} height={26} rx={3.5} fill="#6b5138" {...out({ fill: '#6b5138' })} />
    <path d="M30 26c-3-4-7-6-10-6M34 26c3-4 7-6 10-6" fill="none" {...out()} />
  </g>
);

const garden_snail = (
  <g>
    <path d="M12 52c14 4 30 4 40 0-2-8-10-11-20-11s-18 3-20 11Z" fill="#9db86e" {...out()} />
    <circle cx={38} cy={32} r={16} fill="#c98d5a" {...out()} />
    <path d="M38 22a10 10 0 0 1 10 10 7 7 0 0 1-7 7 5 5 0 0 1-5-5 3 3 0 0 1 3-3" fill="none" {...out()} />
    <path d="M16 44c-2-8-2-16 1-22" fill="none" {...out()} />
    <circle cx={15} cy={20} r={3} fill="#9db86e" {...out()} />
    {eye(15, 20, 1.6)}
  </g>
);

const stray_tabby = (
  <g>
    <path d="M16 24l-3-10 9 5M48 24l3-10-9 5" fill="#e2953f" {...out()} />
    <ellipse cx={32} cy={38} rx={20} ry={17} fill="#e2953f" {...out()} />
    <path d="M14 34c-3 6-2 12 2 16M50 34c3 6 2 12-2 16" fill="none" stroke="#b56f28" strokeWidth={3} strokeLinecap="round" />
    <path d="M27 44c2 2 8 2 10 0M32 40v4" fill="none" {...out()} />
    <path d="M30 39a2.4 2.4 0 0 1 4 0c0 1.4-2 2.6-2 2.6s-2-1.2-2-2.6Z" fill="#d96a55" stroke="none" />
    {eye(24, 34)}
    {eye(40, 34)}
    <path d="M8 40l10 1M8 46l10-1M56 40l-10 1M56 46l-10-1" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
    {blush(18, 42)}
    {blush(46, 42)}
  </g>
);

const ant_trail = (
  <g>
    {[10, 30, 48].map((x, i) => (
      <g key={i} transform={`translate(${x} ${38 + (i % 2) * 6})`}>
        <circle cx={0} cy={0} r={5} fill="#7a4a33" {...out()} />
        <circle cx={7} cy={-1} r={4} fill="#7a4a33" {...out()} />
        <circle cx={13} cy={-3} r={3.4} fill="#7a4a33" {...out()} />
        {eye(14, -4, 1.2)}
        <path d="M-2 4l-3 5M2 4l0 6M6 4l3 5" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      </g>
    ))}
    <path d="M6 56c16-6 36-6 52-1" stroke="#c9b48f" strokeWidth={2} strokeDasharray="2 4" fill="none" />
  </g>
);

const dragonfly = (
  <g>
    <ellipse cx={20} cy={26} rx={14} ry={5.5} fill="#cfe9f0" opacity={0.92} {...out({ fill: '#cfe9f0' })} transform="rotate(-18 20 26)" />
    <ellipse cx={44} cy={26} rx={14} ry={5.5} fill="#cfe9f0" opacity={0.92} {...out({ fill: '#cfe9f0' })} transform="rotate(18 44 26)" />
    <ellipse cx={22} cy={35} rx={12} ry={4.6} fill="#e4f3f6" opacity={0.9} {...out({ fill: '#e4f3f6' })} transform="rotate(-8 22 35)" />
    <ellipse cx={42} cy={35} rx={12} ry={4.6} fill="#e4f3f6" opacity={0.9} {...out({ fill: '#e4f3f6' })} transform="rotate(8 42 35)" />
    <circle cx={32} cy={24} r={6} fill="#4f9e8f" {...out()} />
    <path d="M32 30c1 8 1 16-2 24" stroke="#4f9e8f" strokeWidth={6} strokeLinecap="round" />
    <path d="M32 30c1 8 1 16-2 24" fill="none" {...out()} />
    {eye(29, 22, 2)}
    {eye(35, 22, 2)}
  </g>
);

const moth = (
  <g>
    <path d="M30 36C22 22 8 20 6 30c-2 8 8 14 22 13" fill="#d8cbb2" {...out()} />
    <path d="M34 36c8-14 22-16 24-6 2 8-8 14-22 13" fill="#d8cbb2" {...out()} />
    <circle cx={17} cy={30} r={4} fill="#a08d6a" />
    <circle cx={47} cy={30} r={4} fill="#a08d6a" />
    <ellipse cx={32} cy={42} rx={5} ry={11} fill="#b8a683" {...out()} />
    <path d="M29 32c-4-5-9-6-12-5M35 32c4-5 9-6 12-5" fill="none" {...out()} />
    {eye(30, 38, 1.6)}
    {eye(34, 38, 1.6)}
  </g>
);

const squirrel = (
  <g>
    <path d="M40 14c12 2 18 14 14 26-3 9-11 14-18 14 6-8 8-18 4-26" fill="#b3603c" {...out()} />
    <ellipse cx={26} cy={40} rx={15} ry={14} fill="#cc7a4e" {...out()} />
    <path d="M20 26l-2-8 7 4" fill="#cc7a4e" {...out()} />
    <path d="M33 26l2-8-7 4" fill="#cc7a4e" {...out()} />
    <ellipse cx={26} cy={46} rx={7} ry={5} fill="#f3ddc3" stroke="none" />
    <circle cx={30} cy={50} r={4} fill="#8a5432" {...out()} />
    {eye(20, 36)}
    {eye(32, 36)}
    <path d="M24 42c1.4 1.6 4.6 1.6 6 0" fill="none" {...out()} />
    {blush(15, 42)}
  </g>
);

const hedgehog = (
  <g>
    <path d="M10 46c-2-18 10-30 26-28 4-4 10-5 14-3-2 2-3 5-3 7 6 6 8 15 5 24Z" fill="#8a6a4c" {...out()} />
    {[
      [16, 24],
      [26, 18],
      [37, 16],
      [46, 20],
      [12, 34],
      [22, 28],
      [33, 25],
      [44, 28],
      [50, 33],
    ].map(([x, y], i) => (
      <path key={i} d={`M${x} ${y}l4-8 3 8`} fill="#6d5138" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
    ))}
    <path d="M10 46c4 6 12 9 22 9s19-3 20-9c-6-5-14-7-21-7s-16 2-21 7Z" fill="#e9d3b4" {...out()} />
    <circle cx={13} cy={44} r={2.8} fill={INK} />
    {eye(22, 42)}
    {blush(28, 47)}
  </g>
);

const kingfisher = (
  <g>
    <path d="M16 38c0-12 9-21 20-21 10 0 17 7 17 17 0 11-8 19-19 19-10 0-18-6-18-15Z" fill="#3f7fb5" {...out()} />
    <path d="M30 18c6-3 14-2 19 3-4 4-10 5-15 3" fill="#2b5f8f" stroke="none" />
    <path d="M22 42c5 4 13 4 18 0v8c-5 3-13 3-18 0Z" fill="#e8934a" stroke="none" />
    <path d="M18 30l-12 4 12 4" fill="#28455e" {...out({ fill: '#28455e' })} />
    <path d="M52 32l9 3-9 3" fill="#e8934a" {...out({ fill: '#e8934a' })} />
    {eye(41, 30)}
    <path d="M28 56l2-4M36 56l2-4" {...out()} fill="none" />
  </g>
);

const firefly_swarm = (
  <g>
    {[
      [18, 22, 1],
      [42, 16, 0.8],
      [52, 34, 0.9],
      [12, 40, 0.7],
      [30, 48, 0.85],
    ].map(([x, y, k], i) => (
      <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
        <circle cx={0} cy={0} r={7} fill="#ffe9a3" opacity={0.45} />
        <circle cx={0} cy={0} r={3.4} fill="#ffd45e" />
        <circle cx={0} cy={-3.4} r={2.4} fill="#6d5138" />
        <path d="M-2.6-5.4l-2-2.4M2.6-5.4l2-2.4" stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
      </g>
    ))}
  </g>
);

const otter = (
  <g>
    <ellipse cx={34} cy={42} rx={16} ry={13} fill="#8a5f42" {...out()} />
    <circle cx={34} cy={24} r={12} fill="#8a5f42" {...out()} />
    <circle cx={24} cy={15} r={3.6} fill="#8a5f42" {...out()} />
    <circle cx={44} cy={15} r={3.6} fill="#8a5f42" {...out()} />
    <ellipse cx={34} cy={28} rx={6.4} ry={4.6} fill="#e9d3b4" stroke="none" />
    <circle cx={34} cy={25.6} r={2.2} fill={INK} />
    <path d="M31.6 30c1.4 1.4 3.4 1.4 4.8 0" fill="none" {...out()} />
    {eye(28, 22)}
    {eye(40, 22)}
    <path d="M50 46c5-1 8-5 8-9" fill="none" stroke="#8a5f42" strokeWidth={6} strokeLinecap="round" />
    <path d="M50 46c5-1 8-5 8-9" fill="none" {...out()} />
    <ellipse cx={30} cy={46} rx={5} ry={3.4} fill="#6d4630" opacity={0.5} />
    {blush(24, 30)}
    {blush(44, 30)}
  </g>
);

const hornbill = (
  <g>
    <ellipse cx={38} cy={38} rx={16} ry={15} fill="#2e2a28" {...out()} />
    <circle cx={30} cy={22} r={10} fill="#f5efe2" {...out()} />
    <path d="M22 20C12 18 6 22 4 27c6 2 12 2 17 0" fill="#f2b23e" {...out()} />
    <path d="M21 14c-3-2-7-2-9 0 2 3 6 4 9 3" fill="#e08c2f" {...out()} />
    <path d="M40 26c6 3 10 9 10 15" stroke="#f5efe2" strokeWidth={5} strokeLinecap="round" fill="none" />
    {eye(31, 20)}
    <path d="M32 54l3-6M42 53l2-6" {...out()} fill="none" />
    <path d="M50 44l7 6" stroke={INK} strokeWidth={3} strokeLinecap="round" />
  </g>
);

/* ── plants (mature) ──────────────────────────────────────────────── */

const grass_tuft = (
  <g>
    <path d="M32 56c-2-14-8-24-14-28 8 1 13 6 15 12 1-10-2-19-7-24 8 3 12 11 12 20 3-8 8-13 14-15-5 7-8 16-8 24" fill="#8fbf6a" {...out()} />
    <path d="M18 56h28" {...out()} />
  </g>
);

const sunflower = (
  <g>
    <path d="M32 34v22" stroke="#5d8c46" strokeWidth={5} strokeLinecap="round" />
    <path d="M32 44c-6-2-10-1-13 2 4 3 9 3 13 0M32 48c6-2 10-1 13 2-4 3-9 3-13 0" fill="#74a656" {...out({ fill: '#74a656' })} />
    {Array.from({ length: 10 }, (_, i) => {
      const a = (i * 36 * Math.PI) / 180;
      return <ellipse key={i} cx={32 + Math.cos(a) * 11} cy={20 + Math.sin(a) * 11} rx={5.4} ry={3.6} fill="#f4c14d" transform={`rotate(${i * 36} ${32 + Math.cos(a) * 11} ${20 + Math.sin(a) * 11})`} stroke={INK} strokeWidth={1.6} />;
    })}
    <circle cx={32} cy={20} r={7.5} fill="#8a5f3c" {...out()} />
    <circle cx={30} cy={18} r={1.2} fill="#5f3f26" />
    <circle cx={34} cy={21} r={1.2} fill="#5f3f26" />
  </g>
);

const lavender = (
  <g>
    <path d="M20 56c1-12 0-22-3-28M32 56V24M44 56c-1-12 0-22 3-28" stroke="#5d8c46" strokeWidth={3.4} strokeLinecap="round" fill="none" />
    {[
      [17, 22],
      [32, 16],
      [47, 22],
    ].map(([x, y], i) => (
      <g key={i}>
        {[0, 1, 2, 3].map((r) => (
          <ellipse key={r} cx={x} cy={y - r * 5} rx={4.6 - r * 0.7} ry={3} fill={r % 2 ? '#a68ade' : '#8f6fd0'} stroke={INK} strokeWidth={1.4} />
        ))}
      </g>
    ))}
    <path d="M26 48c-4-2-8-2-11 0M38 48c4-2 8-2 11 0" fill="none" {...out()} />
  </g>
);

const fern = (
  <g>
    <path d="M32 56C30 40 20 30 10 28c4 10 12 16 20 17M32 56c0-18 8-30 20-33-2 11-10 20-18 22M32 56V20" stroke="#4c8f5d" strokeWidth={3.6} strokeLinecap="round" fill="none" />
    {[0, 1, 2, 3].map((i) => (
      <g key={i}>
        <path d={`M32 ${24 + i * 7}c-5-2-9-1-12 2`} stroke="#63a873" strokeWidth={3} strokeLinecap="round" fill="none" />
        <path d={`M32 ${24 + i * 7}c5-2 9-1 12 2`} stroke="#63a873" strokeWidth={3} strokeLinecap="round" fill="none" />
      </g>
    ))}
    <path d="M32 20c-1-3 0-6 2-8" stroke="#4c8f5d" strokeWidth={3} strokeLinecap="round" fill="none" />
  </g>
);

const mint_patch = (
  <g>
    {[
      [18, 42, -14],
      [32, 36, 0],
      [46, 42, 14],
    ].map(([x, y, r], i) => (
      <g key={i} transform={`rotate(${r} ${x} ${y})`}>
        <path d={`M${x} ${y}c-8-2-10-10-6-16 6 0 10 5 10 11`} fill="#7fbf80" {...out()} />
        <path d={`M${x} ${y}c8-2 10-10 6-16-6 0-10 5-10 11`} fill="#5da267" {...out()} />
        <path d={`M${x} ${y - 14}v14`} stroke={INK} strokeWidth={1.4} />
      </g>
    ))}
    <path d="M14 56c12-4 24-4 36 0" fill="#4f7d4a" {...out()} />
  </g>
);

const berry_bush = (
  <g>
    <circle cx={22} cy={38} r={14} fill="#4f7d4a" {...out()} />
    <circle cx={42} cy={36} r={15} fill="#5e9457" {...out()} />
    <circle cx={31} cy={46} r={12} fill="#4f7d4a" stroke="none" />
    <path d="M10 52h44" {...out()} />
    {[
      [20, 34],
      [30, 42],
      [42, 32],
      [47, 42],
      [35, 26],
    ].map(([x, y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r={4} fill="#5b6dc4" stroke={INK} strokeWidth={1.6} />
        <circle cx={x - 1.2} cy={y - 1.2} r={1.1} fill="#c9d2f2" />
      </g>
    ))}
  </g>
);

const water_lily = (
  <g>
    <ellipse cx={32} cy={48} rx={24} ry={9} fill="#3f8d63" {...out()} />
    <path d="M32 48 50 42a24 9 0 0 0-18-3Z" fill="#e9f3ea" stroke={INK} strokeWidth={1.6} />
    {[[-26, '#f3a7c0'], [0, '#f7c6d7'], [26, '#f3a7c0']].map(([r, c], i) => (
      <path key={i} d="M32 40c-5-8-4-16 0-22 4 6 5 14 0 22Z" fill={c as string} {...out()} transform={`rotate(${r} 32 40)`} />
    ))}
    <circle cx={32} cy={36} r={3.4} fill="#f4c14d" {...out()} />
  </g>
);

const frangipani = (
  <g>
    <path d="M30 56c2-12 2-24-2-32" stroke="#8a6a4c" strokeWidth={4} strokeLinecap="round" fill="none" />
    {[
      [18, 20, 0],
      [40, 14, 20],
      [50, 32, -15],
    ].map(([x, y, r], i) => (
      <g key={i} transform={`rotate(${r} ${x} ${y})`}>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx={x + Math.cos(((a - 90) * Math.PI) / 180) * 5.6} cy={y + Math.sin(((a - 90) * Math.PI) / 180) * 5.6} rx={4} ry={5.4} fill="#fdf3e0" stroke={INK} strokeWidth={1.4} transform={`rotate(${a} ${x + Math.cos(((a - 90) * Math.PI) / 180) * 5.6} ${y + Math.sin(((a - 90) * Math.PI) / 180) * 5.6})`} />
        ))}
        <circle cx={x} cy={y} r={2.8} fill="#f4c14d" />
      </g>
    ))}
    <path d="M30 34c-6 1-10 4-12 8M32 28c6-1 11 1 14 4" stroke="#5d8c46" strokeWidth={3} strokeLinecap="round" fill="none" />
  </g>
);

const night_jasmine = (
  <g>
    <path d="M32 56c-1-10-1-20 0-28" stroke="#5d7a4c" strokeWidth={4} strokeLinecap="round" fill="none" />
    <circle cx={32} cy={26} r={15} fill="#3d5a44" {...out()} />
    {[
      [24, 20],
      [40, 18],
      [32, 32],
      [44, 30],
      [20, 32],
    ].map(([x, y], i) => (
      <g key={i}>
        {[0, 90, 180, 270].map((a) => (
          <ellipse key={a} cx={x} cy={y - 3.4} rx={2} ry={3.2} fill="#fbf7ea" stroke={INK} strokeWidth={1} transform={`rotate(${a} ${x} ${y})`} />
        ))}
        <circle cx={x} cy={y} r={1.6} fill="#f4c14d" />
      </g>
    ))}
    <circle cx={45} cy={12} r={3} fill="#fbf7ea" opacity={0.8} />
  </g>
);

const rain_tree = (
  <g>
    <path d="M30 56c2-10 2-20-1-26" stroke="#7a563a" strokeWidth={5} strokeLinecap="round" fill="none" />
    <path d="M29 38c-6-2-10-7-10-12M31 34c5-3 8-8 8-13" stroke="#7a563a" strokeWidth={3.4} strokeLinecap="round" fill="none" />
    <path d="M8 26C8 16 18 8 32 8s24 8 24 18c0 6-5 10-11 10H19c-6 0-11-4-11-10Z" fill="#5e9457" {...out()} />
    <path d="M14 22c4-6 12-9 18-9" stroke="#8fbf6a" strokeWidth={3} strokeLinecap="round" fill="none" />
    <path d="M20 56h22" {...out()} />
  </g>
);

/* ── growth stages (generic) ──────────────────────────────────────── */

const stage_seed = (
  <g>
    <path d="M32 52c-9 0-14-6-13-14 1-9 7-14 13-14s12 5 13 14c1 8-4 14-13 14Z" fill="#a3744c" {...out()} />
    <path d="M32 26c-2 6-2 14 0 24" stroke={INK} strokeWidth={1.8} fill="none" />
    <path d="M26 32c2 3 8 3 12 0" stroke="#7c5433" strokeWidth={2} strokeLinecap="round" fill="none" />
  </g>
);

const stage_sprout = (
  <g>
    <path d="M32 56V38" stroke="#5d8c46" strokeWidth={4} strokeLinecap="round" />
    <path d="M32 40c-2-10-9-14-16-13 2 8 8 13 16 13Z" fill="#8fbf6a" {...out()} />
    <path d="M32 36c2-8 8-12 14-11-2 7-7 11-14 11Z" fill="#5da267" {...out()} />
    <ellipse cx={32} cy={57} rx={10} ry={3} fill="#8a6a4c" opacity={0.5} />
  </g>
);

/* ── objects ──────────────────────────────────────────────────────── */

const bird_bath = (
  <g>
    <ellipse cx={32} cy={20} rx={20} ry={7} fill="#c9c9bd" {...out()} />
    <ellipse cx={32} cy={18.6} rx={14} ry={4.4} fill="#8fd0e0" stroke="none" />
    <path d="M26 26c1 4 1 6-2 9h16c-3-3-3-5-2-9" fill="#b5b5a8" {...out()} />
    <path d="M20 35h24l-3 8H23Z" fill="#c9c9bd" {...out()} />
    <path d="M16 52c4-5 10-9 16-9s12 4 16 9Z" fill="#b5b5a8" {...out()} />
    <path d="M27 17c2-2 6-2 8 0" stroke="#e6f6fa" strokeWidth={2} strokeLinecap="round" fill="none" />
  </g>
);

const scratching_post = (
  <g>
    <rect x={26} y={14} width={12} height={34} rx={4} fill="#d9b382" {...out()} />
    {[20, 27, 34, 41].map((y) => (
      <path key={y} d={`M27 ${y}c4 2 7 2 10 0`} stroke="#a97850" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    ))}
    <ellipse cx={32} cy={52} rx={17} ry={5.4} fill="#b98f5f" {...out()} />
    <circle cx={32} cy={11} r={5.4} fill="#e2953f" {...out()} />
    <path d="M20 16c4-5 8-6 12-5" stroke={INK} strokeWidth={1.8} fill="none" strokeDasharray="3 3" />
  </g>
);

const stone_lantern = (
  <g>
    <path d="M22 12h20l-4 6H26Z" fill="#a8a89b" {...out()} />
    <rect x={25} y={18} width={14} height={12} rx={2} fill="#efe3c0" {...out()} />
    <circle cx={32} cy={24} r={3.6} fill="#f4c14d" />
    <path d="M24 30h16v6H24Z" fill="#a8a89b" {...out()} />
    <rect x={28} y={36} width={8} height={12} fill="#b5b5a8" {...out()} />
    <ellipse cx={32} cy={51} rx={13} ry={4.4} fill="#a8a89b" {...out()} />
  </g>
);

const log_pile = (
  <g>
    {[
      [22, 40],
      [42, 40],
      [32, 28],
    ].map(([x, y], i) => (
      <g key={i}>
        <rect x={x - 15} y={y - 8} width={30} height={16} rx={8} fill="#a97850" {...out()} />
        <circle cx={x + 12} cy={y} r={6.4} fill="#e0c193" {...out()} />
        <circle cx={x + 12} cy={y} r={2.6} fill="none" stroke="#a97850" strokeWidth={1.6} />
      </g>
    ))}
    <path d="M12 52h40" {...out()} />
  </g>
);

const bird_feeder = (
  <g>
    <path d="M32 6v8" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    <path d="M18 22h28l-4-8H22Z" fill="#c98d5a" {...out()} />
    <rect x={22} y={22} width={20} height={12} rx={2} fill="#e0c193" {...out()} />
    <path d="M24 34c2 3 4 8 3 12M40 34c-2 3-4 8-3 12" stroke={INK} strokeWidth={1.8} fill="none" />
    <ellipse cx={32} cy={31} rx={7} ry={2.6} fill="#8a5f3c" />
    {[26, 32, 38].map((x, i) => (
      <circle key={i} cx={x} cy={30 - (i % 2)} r={1.4} fill="#f4c14d" />
    ))}
  </g>
);

/* ── the Gnome + magic seeds (parcel pouch kept as an icon) ────────── */

const pkg_parcel = (
  <g>
    <rect x={12} y={22} width={40} height={28} rx={4} fill="#c98d5a" {...out()} />
    <path d="M12 34h40M30 22v28M34 22v28" stroke={INK} strokeWidth={1.8} />
    <path d="M28 22c-2-4 0-8 4-8s6 4 4 8" fill="none" {...out()} />
  </g>
);

const pkg_box = (
  <g>
    <rect x={13} y={24} width={38} height={26} rx={5} fill="#c4453e" {...out()} />
    <rect x={10} y={18} width={44} height={10} rx={4} fill="#a83a34" {...out()} />
    <path d="M32 18v32M22 32c4-3 8-3 10 0 2-3 6-3 10 0" stroke="#e0b23e" strokeWidth={3.4} fill="none" strokeLinecap="round" />
    <circle cx={32} cy={14} r={4} fill="#e0b23e" {...out()} />
  </g>
);


const gnome = (
  <g>
    {/* hat */}
    <path d="M14 26C18 12 30 6 32 6s14 6 18 20c-10-4-24-4-36 0Z" fill="#c4453e" {...out()} />
    <circle cx={32} cy={7} r={3} fill="#e88a8a" {...out()} />
    {/* face */}
    <circle cx={32} cy={30} r={12} fill="#f2c79a" {...out()} />
    <path d="M14 27c8-3 28-3 36 0" fill="none" {...out()} />
    {eye(28, 29)}
    {eye(36, 29)}
    {blush(24, 33)}
    {blush(40, 33)}
    {/* big white beard */}
    <path d="M20 33c-2 14 6 24 12 24s14-10 12-24c-6 4-18 4-24 0Z" fill="#f5efd8" {...out()} />
    <path d="M26 40c3 3 9 3 12 0" fill="none" stroke="#cfc8b2" strokeWidth={2} strokeLinecap="round" />
    {/* body peeking below beard */}
    <path d="M22 55c2-4 4-6 10-6s8 2 10 6" fill="#4f7a42" {...out()} />
    <path d="M30 12l1-4 3 2" fill="#f2c79a" stroke="none" />
  </g>
);

const magic_seed = (
  <g>
    <ellipse cx={32} cy={40} rx={16} ry={19} fill="#a3744c" {...out()} />
    <path d="M32 22c-6 5-9 12-9 18a9 9 0 0 0 18 0c0-6-3-13-9-18Z" fill="#c99a63" stroke="none" opacity={0.6} />
    <path d="M32 24c-2 8-2 20 0 30" stroke={INK} strokeWidth={1.8} fill="none" />
    {/* sparkle magic */}
    <path d="M46 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffe9a3" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
    <path d="M16 30l1.4 3.6 3.6 1.4-3.6 1.4L16 40l-1.4-3.6L11 35l3.6-1.4z" fill="#fff" stroke="none" opacity={0.9} />
  </g>
);

const form_seedling = (
  <g>
    <path d="M32 56V38" stroke="#7d4bb0" strokeWidth={4} strokeLinecap="round" />
    <path d="M32 40c-2-10-9-14-16-13 2 8 8 13 16 13Z" fill="#bd8ae0" {...out()} />
    <path d="M32 36c2-8 8-12 14-11-2 7-7 11-14 11Z" fill="#9a5fc7" {...out()} />
    <ellipse cx={32} cy={57} rx={11} ry={3} fill="#8a6a4c" opacity={0.5} />
  </g>
);

const form_sapling = (
  <g>
    <path d="M32 56V26" stroke="#8a6a4c" strokeWidth={5} strokeLinecap="round" />
    <path d="M32 40c-6-2-10-6-11-12M32 34c5-2 9-6 10-11" stroke="#7a563a" strokeWidth={3} strokeLinecap="round" fill="none" />
    <circle cx={24} cy={22} r={12} fill="#9a5fc7" {...out()} />
    <circle cx={40} cy={20} r={13} fill="#c89be8" {...out()} />
    <circle cx={33} cy={30} r={11} fill="#9a5fc7" stroke="none" />
    <ellipse cx={32} cy={57} rx={13} ry={3.4} fill="#8a6a4c" opacity={0.5} />
  </g>
);

const form_tree = (
  <g>
    <path d="M30 58V30" stroke="#7a563a" strokeWidth={7} strokeLinecap="round" />
    <path d="M30 40c-7-2-11-8-11-14M31 34c6-3 10-9 10-15" stroke="#7a563a" strokeWidth={4} strokeLinecap="round" fill="none" />
    <circle cx={20} cy={22} r={14} fill="#6a3494" {...out()} />
    <circle cx={44} cy={20} r={15} fill="#9a5fc7" {...out()} />
    <circle cx={32} cy={12} r={15} fill="#c89be8" {...out()} />
    <circle cx={32} cy={30} r={13} fill="#6a3494" stroke="none" />
    <ellipse cx={30} cy={59} rx={16} ry={4} fill="#8a6a4c" opacity={0.5} />
  </g>
);

const form_huge_tree = (
  <g>
    <path d="M30 60V26" stroke="#6d4a2c" strokeWidth={9} strokeLinecap="round" />
    <path d="M30 40c-9-2-14-9-14-17M31 34c8-3 13-10 13-18M30 48c-6-1-10-5-11-10" stroke="#6d4a2c" strokeWidth={4.5} strokeLinecap="round" fill="none" />
    <circle cx={16} cy={22} r={15} fill="#532778" {...out()} />
    <circle cx={48} cy={20} r={16} fill="#6a3494" {...out()} />
    <circle cx={32} cy={9} r={17} fill="#9a5fc7" {...out()} />
    <circle cx={32} cy={30} r={15} fill="#532778" stroke="none" />
    <circle cx={24} cy={16} r={9} fill="#c89be8" stroke="none" />
    <circle cx={44} cy={30} r={8} fill="#c89be8" stroke="none" />
    {/* golden fruit — legendary */}
    {[
      [20, 24],
      [42, 16],
      [34, 34],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={4} fill="#e2b13c" stroke={INK} strokeWidth={2} />
    ))}
    <ellipse cx={30} cy={61} rx={19} ry={4.4} fill="#6d4a2c" opacity={0.5} />
  </g>
);

/* ── cosmetics ────────────────────────────────────────────────────── */

const otter_pond_ornament = (
  <g>
    <ellipse cx={32} cy={50} rx={16} ry={5} fill="#a8a89b" {...out()} />
    <path d="M24 48c-4-10 0-22 8-26 8 4 12 16 8 26" fill="#b5b5a8" {...out()} />
    <circle cx={28} cy={32} r={2} fill={INK} />
    <circle cx={36} cy={32} r={2} fill={INK} />
    <ellipse cx={32} cy={37} rx={4} ry={3} fill="#8f8f82" />
  </g>
);

const hornbill_perch = (
  <g>
    <path d="M16 52V22M16 26c8-4 16-4 24 0M16 38c10-4 20-4 30 0" stroke="#8a6a4c" strokeWidth={4} strokeLinecap="round" fill="none" />
    <circle cx={42} cy={22} r={4} fill="#f2b23e" {...out()} />
    <ellipse cx={20} cy={54} rx={9} ry={3} fill="#8a6a4c" opacity={0.5} />
  </g>
);

const kingfisher_totem = (
  <g>
    <rect x={26} y={20} width={12} height={32} rx={4} fill="#3f7fb5" {...out()} />
    <path d="M26 30h12M26 40h12" stroke={INK} strokeWidth={1.8} />
    <path d="M22 20h20l-10-10Z" fill="#e8934a" {...out()} />
    <circle cx={30} cy={26} r={1.6} fill="#fff" />
    <circle cx={34} cy={26} r={1.6} fill="#fff" />
  </g>
);

const lantern_string = (
  <g>
    <path d="M8 22c16 10 32 10 48 0" stroke={INK} strokeWidth={2} fill="none" />
    {[16, 32, 48].map((x, i) => (
      <g key={i}>
        <path d={`M${x} ${26 + (i % 2) * 3}v4`} stroke={INK} strokeWidth={1.6} />
        <rect x={x - 5} y={30 + (i % 2) * 3} width={10} height={12} rx={4} fill="#ffd45e" {...out()} />
      </g>
    ))}
  </g>
);

const garden_gnome = (
  <g>
    <path d="M32 6l10 18H22Z" fill="#c4453e" {...out()} />
    <circle cx={32} cy={30} r={7} fill="#f2c79a" {...out()} />
    <path d="M26 34c-2 8 0 14 6 16 6-2 8-8 6-16" fill="#4f7fbf" {...out()} />
    <path d="M28 34c1 5 2 8 4 10 2-2 3-5 4-10" fill="#fbf7ea" stroke="none" />
    {eye(30, 29, 1.6)}
    {eye(35, 29, 1.6)}
  </g>
);

const bunting = (
  <g>
    <path d="M6 20c18 8 34 8 52 0" stroke={INK} strokeWidth={2} fill="none" />
    {[
      [12, '#c4453e'],
      [24, '#e0b23e'],
      [36, '#7d9c5c'],
      [48, '#4f7fbf'],
    ].map(([x, c], i) => (
      <path key={i} d={`M${x} ${23 + (i % 2) * 2}l10 2-6 12Z`} fill={c as string} {...out()} />
    ))}
  </g>
);

const pinwheel = (
  <g>
    <path d="M32 26v28" stroke="#8a6a4c" strokeWidth={3} strokeLinecap="round" />
    {[0, 90, 180, 270].map((a, i) => (
      <path key={a} d="M32 26c0-10 6-14 12-12-2 8-6 12-12 12Z" fill={i % 2 ? '#e0b23e' : '#4f9e8f'} {...out()} transform={`rotate(${a} 32 26)`} />
    ))}
    <circle cx={32} cy={26} r={3} fill={INK} />
  </g>
);

const koi_flag = (
  <g>
    <path d="M14 10v44" stroke="#8a6a4c" strokeWidth={3} strokeLinecap="round" />
    <path d="M16 16c10-6 24-6 34 2-4 3-4 7 0 10-10 8-24 8-34 2 4-5 4-9 0-14Z" fill="#e88b8b" {...out()} />
    <circle cx={26} cy={22} r={2.4} fill="#fff" stroke={INK} strokeWidth={1.4} />
    <circle cx={26} cy={22} r={1} fill={INK} />
    <path d="M34 18c2 4 2 8 0 12M42 19c2 3 2 7 0 10" stroke="#c4453e" strokeWidth={2} fill="none" />
  </g>
);

/* ── tag + UI icons ───────────────────────────────────────────────── */

const tag_bright = (
  <g>
    <circle cx={32} cy={32} r={11} fill="#f4c14d" {...out()} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <path key={a} d="M32 14v-6" stroke={INK} strokeWidth={3} strokeLinecap="round" transform={`rotate(${a} 32 32)`} />
    ))}
  </g>
);

const tag_fragrant = (
  <g>
    {[0, 72, 144, 216, 288].map((a) => (
      <ellipse key={a} cx={32} cy={22} rx={6} ry={9} fill="#f3a7c0" {...out()} transform={`rotate(${a} 32 32)`} />
    ))}
    <circle cx={32} cy={32} r={5.4} fill="#f4c14d" {...out()} />
  </g>
);

const tag_shady = (
  <g>
    <path d="M10 36C10 24 20 14 32 14s22 10 22 22c0 4-3 8-8 8H18c-5 0-8-4-8-8Z" fill="#5e9457" {...out()} />
    <path d="M28 44v10M28 50c-3 0-5-2-5-4" stroke="#7a563a" strokeWidth={3.4} strokeLinecap="round" fill="none" />
  </g>
);

const tag_fruiting = (
  <g>
    <circle cx={25} cy={38} r={9} fill="#c4453e" {...out()} />
    <circle cx={41} cy={40} r={8} fill="#d9583b" {...out()} />
    <path d="M27 29c2-6 6-10 12-11M41 32c0-5 1-9 3-12" stroke="#5d8c46" strokeWidth={3} strokeLinecap="round" fill="none" />
    <path d="M38 18c4-2 8-1 10 2-3 3-7 3-10 1Z" fill="#8fbf6a" {...out()} />
    <circle cx={22} cy={35} r={2} fill="#fff" opacity={0.7} />
  </g>
);

const tag_wet = (
  <g>
    <path d="M32 10c8 11 14 19 14 27a14 14 0 0 1-28 0c0-8 6-16 14-27Z" fill="#7db8d9" {...out()} />
    <path d="M25 38a7 7 0 0 0 5 7" stroke="#e6f6fa" strokeWidth={3} strokeLinecap="round" fill="none" />
  </g>
);

const tag_tall = (
  <g>
    <path d="M32 54V20" stroke="#7a563a" strokeWidth={4} strokeLinecap="round" />
    <path d="M32 24c-8 0-13-6-13-13 8 0 13 5 13 13ZM32 32c8 0 13-6 13-13-8 0-13 5-13 13ZM32 40c-7 0-11-5-11-11 7 0 11 4 11 11Z" fill="#5e9457" {...out()} />
  </g>
);

const tag_cosy = (
  <g>
    <path d="M14 30c0-9 8-16 18-16s18 7 18 16v14c0 4-3 6-6 6H20c-3 0-6-2-6-6Z" fill="#e0b23e" {...out()} />
    <path d="M14 34c12 6 24 6 36 0M14 42c12 6 24 6 36 0" stroke="#b98a2b" strokeWidth={2.4} fill="none" />
    <path d="M24 14c2-4 6-6 8-6s6 2 8 6" fill="none" {...out()} />
  </g>
);

const icon_coin = (
  <g>
    <circle cx={32} cy={32} r={20} fill="#e2b13c" {...out()} />
    <circle cx={32} cy={32} r={13} fill="none" stroke="#b98a1f" strokeWidth={2.6} />
    <path d="M32 24c-4 0-6 2-6 4s2 3 6 4 6 2 6 4-2 4-6 4m0-22v24" stroke="#8a5a1a" strokeWidth={3} fill="none" strokeLinecap="round" />
  </g>
);

/** The garden's resident guide — a munchkin cat: big head, stubby legs. */
const munchkin_cat = (
  <g>
    {/* tail */}
    <path d="M52 44c6-2 8-8 5-13" fill="none" stroke="#e2953f" strokeWidth={7} strokeLinecap="round" />
    <path d="M52 44c6-2 8-8 5-13" fill="none" {...out()} />
    {/* body — long and low */}
    <rect x={12} y={34} width={42} height={19} rx={9.5} fill="#f2dfc0" {...out()} />
    <path d="M34 36c4-2 10-2 14 1v14h-14Z" fill="#e2953f" stroke="none" />
    <rect x={12} y={34} width={42} height={19} rx={9.5} fill="none" {...out()} />
    {/* stubby legs */}
    <path d="M18 53v4M27 53v4M40 53v4M49 53v4" stroke={INK} strokeWidth={5.6} strokeLinecap="round" />
    <path d="M18 53v3.4M27 53v3.4M40 53v3.4M49 53v3.4" stroke="#f2dfc0" strokeWidth={3} strokeLinecap="round" />
    {/* head */}
    <path d="M11 15l3-9 8 5M35 15l-3-9-8 5" fill="#e2953f" {...out()} />
    <path d="M14.5 12l1.5-4 3.6 2.4Z" fill="#f0b5a0" stroke="none" />
    <path d="M31.5 12l-1.5-4-3.6 2.4Z" fill="#f0b5a0" stroke="none" />
    <ellipse cx={23} cy={25} rx={16} ry={14.5} fill="#f2dfc0" {...out()} />
    <path d="M10 18c3-3 7-5 11-5" stroke="#e2953f" strokeWidth={4} strokeLinecap="round" fill="none" />
    {eye(16.5, 23, 2.8)}
    {eye(29.5, 23, 2.8)}
    <path d="M21.4 29.2a2 2 0 0 1 3.2 0c0 1.2-1.6 2.2-1.6 2.2s-1.6-1-1.6-2.2Z" fill="#d96a55" stroke="none" />
    <path d="M20 33c1.8 1.6 4.2 1.6 6 0" fill="none" {...out()} />
    <path d="M4 24l8 1M4 30l8-1M42 24l-8 1M42 30l-8-1" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
    {blush(11, 29)}
    {blush(35, 29)}
  </g>
);

const watering_can = (
  <g>
    <path d="M18 26h22v22a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4Z" fill="#8fae62" {...out()} />
    <path d="M18 32 6 24l3-6 11 8" fill="#7d9c52" {...out()} />
    <circle cx={8} cy={21} r={4.6} fill="#dfe8c4" {...out()} />
    <path d="M40 32c6-2 10-6 10-12" fill="none" stroke="#7d9c52" strokeWidth={6} strokeLinecap="round" />
    <path d="M40 32c6-2 10-6 10-12" fill="none" {...out()} />
    <path d="M22 26c0-4 4-7 10-7s10 3 10 7" fill="none" {...out()} />
    <path d="M22 38c4 2 12 2 16 0" stroke="#5f7a3c" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    <path d="M4 30c0 2 1 4 3 5M9 32c0 2 1 3 2 4" stroke="#7db8d9" strokeWidth={2.6} fill="none" strokeLinecap="round" />
  </g>
);

const icon_book = (
  <g>
    <path d="M32 16c-6-4-14-5-20-3v34c6-2 14-1 20 3 6-4 14-5 20-3V13c-6-2-14-1-20 3Z" fill="#e9d3b4" {...out()} />
    <path d="M32 16v34" stroke={INK} strokeWidth={2} />
    <path d="M18 22c4-1 8 0 10 1M18 30c4-1 8 0 10 1M36 23c4-1 8-2 10-1M36 31c4-1 8-2 10-1" stroke="#a3865e" strokeWidth={2} strokeLinecap="round" fill="none" />
  </g>
);

const icon_bag = (
  <g>
    <path d="M16 24h32l-4 28H20Z" fill="#c98d5a" {...out()} />
    <path d="M24 28v-6a8 8 0 0 1 16 0v6" fill="none" {...out()} />
    <path d="M22 34h20" stroke="#8a5f3c" strokeWidth={2.4} strokeLinecap="round" />
  </g>
);

const icon_tree_menu = (
  <g>
    <path d="M30 56c2-8 2-16 0-22" stroke="#7a563a" strokeWidth={5} strokeLinecap="round" fill="none" />
    <circle cx={22} cy={24} r={11} fill="#5e9457" {...out()} />
    <circle cx={40} cy={20} r={12} fill="#74ac62" {...out()} />
    <circle cx={34} cy={32} r={10} fill="#5e9457" stroke="none" />
    <circle cx={40} cy={20} r={12} fill="none" {...out()} />
  </g>
);

const icon_quests = (
  <g>
    <rect x={14} y={10} width={36} height={44} rx={6} fill="#fbf4e2" {...out()} />
    <path d="M24 8h16v8H24Z" fill="#7d9c5c" {...out()} />
    <path d="M22 28l4 4 8-8M22 42l4 4 8-8" stroke="#5e9457" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const icon_social = (
  <g>
    <circle cx={22} cy={24} r={8} fill="#f2c79a" {...out()} />
    <path d="M10 48c1-8 6-13 12-13s11 5 12 13Z" fill="#7d9c5c" {...out()} />
    <circle cx={43} cy={22} r={7} fill="#f2c79a" {...out()} />
    <path d="M33 44c1-7 5-11 10-11s9 4 10 11Z" fill="#4f7fbf" {...out()} />
  </g>
);

const icon_profile = (
  <g>
    <circle cx={32} cy={22} r={10} fill="#f2c79a" {...out()} />
    <path d="M14 52c2-10 9-16 18-16s16 6 18 16Z" fill="#c4784a" {...out()} />
    <path d="M24 15c2-4 6-6 8-6s6 2 8 6" fill="#6b5138" {...out()} />
  </g>
);

const icon_sparkle = (
  <g>
    <path d="M32 10c2 9 5 13 14 16-9 3-12 7-14 16-2-9-5-13-14-16 9-3 12-7 14-16Z" fill="#ffd45e" {...out()} />
    <path d="M48 38c1 4 3 6 7 7-4 1-6 3-7 7-1-4-3-6-7-7 4-1 6-3 7-7Z" fill="#ffe9a3" {...out()} />
  </g>
);

const icon_sleep = (
  <g>
    <path d="M18 22h14l-14 16h14" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M40 32h10l-10 11h10" stroke={INK} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
  </g>
);

const icon_eye = (
  <g>
    <path d="M8 32c7-10 16-15 24-15s17 5 24 15c-7 10-16 15-24 15S15 42 8 32Z" fill="#fbf4e2" {...out()} />
    <circle cx={32} cy={32} r={8} fill="#4f7fbf" {...out()} />
    <circle cx={32} cy={32} r={3} fill={INK} />
    <circle cx={35} cy={29} r={1.6} fill="#fff" />
  </g>
);

const icon_medal = (
  <g>
    <path d="M24 8h6l4 14-8 2Z" fill="#c4453e" {...out()} />
    <path d="M40 8h-6l-4 14 8 2Z" fill="#4f7fbf" {...out()} />
    <circle cx={32} cy={38} r={14} fill="#f4c14d" {...out()} />
    <path d="M32 30l2.4 5 5.6.6-4.2 3.8 1.2 5.6-5-3-5 3 1.2-5.6-4.2-3.8 5.6-.6Z" fill="#fbf4e2" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
  </g>
);

const icon_block = (
  <g>
    <circle cx={32} cy={32} r={20} fill="#e88b8b" {...out()} />
    <path d="M20 20l24 24" stroke={INK} strokeWidth={5} strokeLinecap="round" />
  </g>
);

const icon_camera = (
  <g>
    <rect x={10} y={20} width={44} height={30} rx={6} fill="#5c5c6e" {...out()} />
    <path d="M24 20l3-6h10l3 6" fill="#5c5c6e" {...out()} />
    <circle cx={32} cy={35} r={9} fill="#8fd0e0" {...out()} />
    <circle cx={32} cy={35} r={4} fill="#2b4a5e" />
    <circle cx={46} cy={27} r={2.4} fill="#ffd45e" />
  </g>
);

const icon_leaf = (
  <g>
    <path d="M14 44C14 26 30 14 50 14c2 20-10 34-28 34-3 0-6-1-8-4Z" fill="#8fbf6a" {...out()} />
    <path d="M18 46c8-12 18-20 28-26" stroke="#4f7d4a" strokeWidth={2.6} fill="none" strokeLinecap="round" />
    <path d="M14 52l4-8" {...out()} />
  </g>
);

const icon_gift = pkg_box;

const icon_clock = (
  <g>
    <circle cx={32} cy={34} r={18} fill="#fbf4e2" {...out()} />
    <path d="M32 24v10l7 5" stroke={INK} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 14l-6 6M46 14l6 6" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
  </g>
);

const icon_fast = (
  <g>
    <path d="M12 20l16 12-16 12ZM32 20l16 12-16 12Z" fill="#e0b23e" {...out()} />
  </g>
);

const icon_check = (
  <g>
    <circle cx={32} cy={32} r={20} fill="#7d9c5c" {...out()} />
    <path d="M22 33l7 7 13-15" stroke="#fbf4e2" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const icon_scissors = (
  <g>
    <circle cx={18} cy={44} r={6} fill="none" {...out()} />
    <circle cx={18} cy={20} r={6} fill="none" {...out()} />
    <path d="M23 41 50 22M23 23l27 19" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
    <circle cx={30} cy={32} r={2} fill={INK} />
  </g>
);

const icon_wizard_hat = (
  <g>
    <path d="M32 8l12 26H20Z" fill="#5b4a8f" {...out()} />
    <path d="M12 40c12-8 28-8 40 0l-4 6H16Z" fill="#6f5cae" {...out()} />
    <circle cx={34} cy={20} r={2} fill="#ffd45e" />
    <circle cx={28} cy={28} r={1.6} fill="#ffd45e" />
  </g>
);

const icon_aircon = (
  <g>
    <rect x={10} y={18} width={44} height={16} rx={5} fill="#e6eef2" {...out()} />
    <path d="M16 28h24" stroke="#7db8d9" strokeWidth={2.6} strokeLinecap="round" />
    <circle cx={48} cy={26} r={2} fill="#4f7fbf" />
    <path d="M20 40c0 4-2 5-2 8M32 40c0 4-2 5-2 8M44 40c0 4-2 5-2 8" stroke="#7db8d9" strokeWidth={3} fill="none" strokeLinecap="round" />
  </g>
);

const icon_fan = (
  <g>
    <circle cx={32} cy={30} r={17} fill="none" {...out()} />
    {[0, 120, 240].map((a) => (
      <path key={a} d="M32 30c-2-8 0-13 5-15 3 5 2 11-5 15Z" fill="#8fd0e0" {...out()} transform={`rotate(${a} 32 30)`} />
    ))}
    <circle cx={32} cy={30} r={3.4} fill={INK} />
    <path d="M26 52h12M32 47v5" stroke={INK} strokeWidth={3} strokeLinecap="round" />
  </g>
);

const icon_plug = (
  <g>
    <path d="M24 10v12M40 10v12" stroke={INK} strokeWidth={4} strokeLinecap="round" />
    <path d="M18 22h28v8a14 14 0 0 1-28 0Z" fill="#e0b23e" {...out()} />
    <path d="M32 44v10" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
  </g>
);

const icon_bike = (
  <g>
    <circle cx={17} cy={42} r={10} fill="none" {...out()} />
    <circle cx={47} cy={42} r={10} fill="none" {...out()} />
    <path d="M17 42l10-16h14l6 16M27 26l6 16h-16M25 22h6" fill="none" {...out()} />
  </g>
);

const icon_shower = (
  <g>
    <path d="M20 16a10 10 0 0 1 20 0v4H20Z" fill="#b5b5a8" {...out()} />
    <path d="M30 6h10" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
    {[22, 30, 38].map((x, i) => (
      <path key={i} d={`M${x} 26c0 5-3 8-3 13a4 4 0 1 0 8 0c0-5-3-8-3-13`} fill="#7db8d9" stroke={INK} strokeWidth={1.8} />
    ))}
  </g>
);

const icon_bolt = (
  <g>
    <path d="M36 8 18 36h10l-4 20 20-30H34Z" fill="#f4c14d" {...out()} />
  </g>
);

const icon_label = (
  <g>
    <path d="M14 12h30l8 8v32H14Z" fill="#fbf4e2" {...out()} />
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d={`M20 ${22 + i * 8}h${14 + i * 3}`} stroke={i < 3 ? '#7d9c5c' : '#c9c1ac'} strokeWidth={5} strokeLinecap="round" />
    ))}
  </g>
);

const icon_tap = (
  <g>
    <path d="M14 26h22a10 10 0 0 1 10 10v4h-8v-4a4 4 0 0 0-4-4H14Z" fill="#b5b5a8" {...out()} />
    <path d="M20 26V16h8v10M24 16v-6M18 10h12" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
    <path d="M40 46c0 4-2 5-2 8a3.4 3.4 0 1 0 7 0c0-3-2-4-2-8" fill="#7db8d9" stroke={INK} strokeWidth={1.8} />
  </g>
);

const icon_moon = (
  <g>
    <path d="M40 10a20 20 0 1 0 14 30 17 17 0 0 1-14-30Z" fill="#ffe9a3" {...out()} />
    <circle cx={30} cy={26} r={2.4} fill="#e8cf85" />
    <circle cx={25} cy={36} r={1.6} fill="#e8cf85" />
  </g>
);

const icon_restart = (
  <g>
    <path d="M50 32a18 18 0 1 1-6-13.4" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
    <path d="M44 6l2 13-13 1Z" fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
    <circle cx={32} cy={32} r={4} fill="#e2b13c" stroke={INK} strokeWidth={2} />
  </g>
);

const icon_location = (
  <g>
    <path d="M32 6c11 0 20 9 20 20 0 14-20 32-20 32S12 40 12 26c0-11 9-20 20-20Z" fill="#e88a5d" {...out()} />
    <circle cx={32} cy={26} r={9} fill="#fffdf6" {...out()} />
    <circle cx={32} cy={26} r={3.4} fill={INK} />
  </g>
);

/* Stylised, non-infringing nods to the services (not their real logos). */
const logo_strava = (
  <g>
    <rect x={10} y={10} width={44} height={44} rx={12} fill="#e0703a" {...out()} />
    <path d="M30 16l-9 18h6l3-7 3 7h6Z" fill="#fffdf6" stroke="none" />
    <path d="M35 34l-4 8-4-8h-5l9 16 9-16Z" fill="#fbd4bc" stroke="none" />
  </g>
);

const logo_runna = (
  <g>
    <rect x={10} y={10} width={44} height={44} rx={12} fill="#2f2b4a" {...out()} />
    <circle cx={38} cy={22} r={4} fill="#b6f04e" />
    <path d="M22 46c4-8 8-10 12-8s6-2 8-8" fill="none" stroke="#b6f04e" strokeWidth={4} strokeLinecap="round" />
    <path d="M26 34l6 4-3 8" stroke="#fffdf6" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const logo_anywheel = (
  <g>
    <rect x={10} y={10} width={44} height={44} rx={12} fill="#2e9d5b" {...out()} />
    <circle cx={22} cy={38} r={8} fill="none" stroke="#fffdf6" strokeWidth={3} />
    <circle cx={42} cy={38} r={8} fill="none" stroke="#fffdf6" strokeWidth={3} />
    <path d="M22 38l8-12h9l5 12M30 26l5 12" fill="none" stroke="#fffdf6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const logo_ecovolt = (
  <g>
    <defs>
      <linearGradient id="evgrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#63cf92" />
        <stop offset="1" stopColor="#45b878" />
      </linearGradient>
    </defs>
    <rect x={10} y={10} width={44} height={44} rx={12} fill="url(#evgrad)" {...out()} />
    {/* white italic "EV": bar-E + lightning V */}
    <g transform="translate(5 0) skewX(-9)" fill="#fffdf6" stroke="none">
      <rect x={17} y={20} width={15} height={5} rx={1.5} />
      <rect x={17} y={28} width={11} height={5} rx={1.5} />
      <rect x={17} y={36} width={14} height={5} rx={1.5} />
      <path d="M35 20 L42 43 L49 20" fill="none" stroke="#fffdf6" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </g>
);

const icon_dev = (
  <g>
    <ellipse cx={32} cy={36} rx={14} ry={16} fill="#c4453e" {...out()} />
    <path d="M32 20v32M22 16l6 6M42 16l-6 6" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
    <circle cx={26} cy={32} r={2.6} fill={INK} />
    <circle cx={38} cy={30} r={2.6} fill={INK} />
    <circle cx={27} cy={42} r={2.6} fill={INK} />
    <path d="M18 30l-8-2M18 40l-8 4M46 30l8-2M46 40l8 4" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
  </g>
);

const icon_seedpack = (
  <g>
    <path d="M18 12h28v40l-5-3-4 3-5-3-5 3-4-3-5 3Z" fill="#e9d3b4" {...out()} />
    <circle cx={32} cy={26} r={7} fill="#8fbf6a" {...out()} />
    <path d="M32 33v8" stroke="#5d8c46" strokeWidth={2.6} strokeLinecap="round" />
    <path d="M22 18h20" stroke="#c9b48f" strokeWidth={2} strokeLinecap="round" />
  </g>
);

/* ── registry ─────────────────────────────────────────────────────── */

export const SPRITES: Record<string, JSX.Element> = {
  // creatures
  sparrow,
  honeybee,
  cabbage_butterfly,
  garden_snail,
  stray_tabby,
  ant_trail,
  dragonfly,
  moth,
  squirrel,
  hedgehog,
  kingfisher,
  firefly_swarm,
  otter,
  hornbill,
  // plants
  grass_tuft,
  sunflower,
  lavender,
  fern,
  mint_patch,
  berry_bush,
  water_lily,
  frangipani,
  night_jasmine,
  rain_tree,
  stage_seed,
  stage_sprout,
  // objects
  bird_bath,
  scratching_post,
  stone_lantern,
  log_pile,
  bird_feeder,
  // traders + packages
  // magic seeds + the Gnome (replaces the four traders)
  gnome,
  magic_seed,
  form_seedling,
  form_sapling,
  form_tree,
  form_huge_tree,
  pkg_parcel,
  pkg_box,
  // cosmetics
  otter_pond_ornament,
  hornbill_perch,
  kingfisher_totem,
  lantern_string,
  garden_gnome,
  bunting,
  pinwheel,
  koi_flag,
  // tags
  tag_bright,
  tag_fragrant,
  tag_shady,
  tag_fruiting,
  tag_wet,
  tag_tall,
  tag_cosy,
  // ui
  icon_coin,
  icon_book,
  icon_bag,
  icon_tree_menu,
  icon_quests,
  icon_social,
  icon_profile,
  icon_sparkle,
  icon_sleep,
  icon_eye,
  icon_medal,
  icon_block,
  icon_camera,
  icon_leaf,
  icon_gift,
  icon_clock,
  icon_fast,
  icon_check,
  icon_scissors,
  icon_wizard_hat,
  icon_aircon,
  icon_fan,
  icon_plug,
  icon_bike,
  icon_shower,
  icon_bolt,
  icon_label,
  icon_tap,
  icon_moon,
  icon_dev,
  icon_restart,
  icon_seedpack,
  icon_location,
  logo_strava,
  logo_runna,
  logo_anywheel,
  logo_ecovolt,
  watering_can,
  munchkin_cat,
};

/** HTML context: a standalone inline SVG. */
export function Sprite({
  id,
  size = 40,
  className,
  title,
}: {
  id: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  const node = SPRITES[id];
  if (!node) return null;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-label={title} role={title ? 'img' : undefined} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      {node}
    </svg>
  );
}

/** SVG-scene context: bottom-centre anchored at (x, y). */
export function SceneSprite({
  id,
  x,
  y,
  size,
  className,
  opacity,
}: {
  id: string;
  x: number;
  y: number;
  size: number;
  className?: string;
  opacity?: number;
}) {
  const node = SPRITES[id];
  if (!node) return null;
  return (
    <g transform={`translate(${x - size / 2} ${y - size}) scale(${size / 64})`} className={className} opacity={opacity}>
      {node}
    </g>
  );
}

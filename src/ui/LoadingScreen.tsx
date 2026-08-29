/**
 * LoadingScreen — board 6a of the published design, replicated 1:1 from its
 * markup (390×844 stage, scaled to cover the phone frame): cream sky, sun and
 * clouds, lantern figs framing both edges, the Vol[tree]opia wordmark, moon
 * moth + cloud koi, and the cast gathered on the meadow above the sage
 * progress bar. Only the bar and caption are live; everything else is the
 * board, verbatim.
 */
import { useEffect, useRef, useState } from 'react';

const TIPS = [
  'tip: cattails love the pond edge',
  'tip: wilted just means thirsty',
  'tip: rare seeds only come from the Gnome',
  'tip: tap visitors before they wander off',
];

const MIN_SHOW_MS = 2600;

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(4);
  const [tip, setTip] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setScale(Math.max(r.width / 390, r.height / 844));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const start = performance.now();
    const iv = setInterval(() => {
      setPct(Math.min(100, Math.round(4 + ((performance.now() - start) / MIN_SHOW_MS) * 96)));
    }, 80);
    const tipIv = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 900);
    let t2 = 0;
    const t1 = window.setTimeout(async () => {
      try {
        await document.fonts?.ready;
      } catch {
        // fonts API unavailable — proceed anyway
      }
      setLeaving(true);
      t2 = window.setTimeout(onDone, 450);
    }, MIN_SHOW_MS);
    return () => {
      clearInterval(iv);
      clearInterval(tipIv);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 z-[70] overflow-hidden transition-opacity duration-500 ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      style={{ background: '#f3e6c4' }}
    >
      <div
        className="absolute top-1/2 left-1/2"
        style={{ width: 390, height: 844, transform: `translate(-50%,-50%) scale(${scale})` }}
      >
        <svg viewBox="0 0 390 844" width="390" height="844" style={{ display: 'block' }}>
          {/* sky + meadow */}
          <rect x="0" y="0" width="390" height="580" fill="#f3e6c4" />
          <rect x="0" y="560" width="390" height="284" fill="#adcb84" />
          <ellipse cx="90" cy="572" rx="150" ry="30" fill="#9bbd72" />
          <ellipse cx="320" cy="580" rx="160" ry="34" fill="#9bbd72" />
          {/* sun */}
          <circle cx="322" cy="84" r="46" fill="#f7e6b8" opacity="0.7" />
          <circle cx="322" cy="84" r="30" fill="#eab54e" stroke="#57422e" strokeWidth="3" />
          <circle cx="314" cy="76" r="9" fill="#f5d98a" />
          {/* clouds */}
          <g stroke="#57422e" strokeWidth="2.5" fill="#fdf6e8" strokeLinejoin="round">
            <path d="M40 96 a14 14 0 0 1 14 -13 a16 16 0 0 1 30 -2 a13 13 0 0 1 16 15 z" />
            <path d="M204 52 a12 12 0 0 1 12 -11 a14 14 0 0 1 26 -2 a11 11 0 0 1 14 13 z" />
            <path d="M96 178 a10 10 0 0 1 10 -9 a12 12 0 0 1 22 -2 a9 9 0 0 1 12 11 z" opacity="0.85" />
          </g>
          {/* LEFT lantern fig framing */}
          <g stroke="#57422e" strokeWidth="3" strokeLinejoin="round">
            <path d="M28 620 C20 440 10 300 -10 220" fill="none" strokeWidth="16" stroke="#57422e" />
            <path d="M28 620 C20 440 10 300 -10 220" fill="none" strokeWidth="10" stroke="#8a5a2e" />
            <path d="M18 460 q40 -16 62 -44" fill="none" strokeWidth="9" stroke="#57422e" strokeLinecap="round" />
            <path d="M18 460 q40 -16 62 -44" fill="none" strokeWidth="5" stroke="#8a5a2e" strokeLinecap="round" />
            <g fill="#5f8a4a">
              <ellipse cx="-6" cy="150" rx="90" ry="60" />
              <ellipse cx="60" cy="90" rx="80" ry="52" />
              <ellipse cx="86" cy="392" rx="52" ry="34" />
            </g>
            <g fill="#78a35c" stroke="none">
              <ellipse cx="30" cy="110" rx="44" ry="26" />
              <ellipse cx="-10" cy="170" rx="40" ry="22" />
              <ellipse cx="80" cy="380" rx="26" ry="15" />
            </g>
            <g fill="#ffd98f" stroke="none" opacity="0.55">
              <circle cx="46" cy="176" r="13" />
              <circle cx="104" cy="128" r="12" />
              <circle cx="98" cy="414" r="11" />
            </g>
            <g strokeWidth="2.2">
              <circle cx="46" cy="176" r="7.5" fill="#f0a94e" />
              <circle cx="104" cy="128" r="7" fill="#f0a94e" />
              <circle cx="98" cy="414" r="6.5" fill="#f0a94e" />
            </g>
          </g>
          {/* RIGHT lantern fig framing */}
          <g stroke="#57422e" strokeWidth="3" strokeLinejoin="round">
            <path d="M366 600 C376 460 384 330 400 250" fill="none" strokeWidth="14" stroke="#57422e" />
            <path d="M366 600 C376 460 384 330 400 250" fill="none" strokeWidth="8" stroke="#8a5a2e" />
            <g fill="#5f8a4a">
              <ellipse cx="392" cy="180" rx="86" ry="58" />
              <ellipse cx="340" cy="120" rx="64" ry="40" />
            </g>
            <g fill="#78a35c" stroke="none">
              <ellipse cx="360" cy="130" rx="34" ry="20" />
              <ellipse cx="396" cy="196" rx="38" ry="22" />
            </g>
            <g fill="#ffd98f" stroke="none" opacity="0.55">
              <circle cx="330" cy="188" r="12" />
              <circle cx="376" cy="242" r="11" />
            </g>
            <g strokeWidth="2.2">
              <circle cx="330" cy="188" r="7" fill="#f0a94e" />
              <circle cx="376" cy="242" r="6.5" fill="#f0a94e" />
            </g>
            {/* hanging vine with morning glories */}
            <path d="M320 158 q-6 60 8 108" fill="none" stroke="#3f6a38" strokeWidth="3.5" strokeLinecap="round" />
            <g>
              <circle cx="316" cy="206" r="8" fill="#7f9edb" strokeWidth="2.2" />
              <circle cx="316" cy="206" r="2.8" fill="#fff" stroke="none" />
            </g>
            <g>
              <circle cx="326" cy="258" r="7" fill="#8ea9e4" strokeWidth="2.2" />
              <circle cx="326" cy="258" r="2.4" fill="#fff" stroke="none" />
            </g>
          </g>
          {/* WORDMARK : Vol[tree]opia */}
          <g transform="translate(0,6)">
            <g transform="rotate(-3 100 300)">
              <text x="150" y="316" textAnchor="end" style={{ font: '62px Caprasimo,serif' }} fill="#57422e" stroke="#57422e" strokeWidth="13" strokeLinejoin="round" paintOrder="stroke" transform="translate(0,5)">
                Vol
              </text>
              <text x="150" y="316" textAnchor="end" style={{ font: '62px Caprasimo,serif' }} fill="#c67139" stroke="#fdf6e8" strokeWidth="5" strokeLinejoin="round" paintOrder="stroke">
                Vol
              </text>
            </g>
            <g transform="rotate(2 300 300)">
              <text x="220" y="316" style={{ font: '62px Caprasimo,serif' }} fill="#57422e" stroke="#57422e" strokeWidth="13" strokeLinejoin="round" paintOrder="stroke" transform="translate(0,5)">
                opia
              </text>
              <text x="220" y="316" style={{ font: '62px Caprasimo,serif' }} fill="#c67139" stroke="#fdf6e8" strokeWidth="5" strokeLinejoin="round" paintOrder="stroke">
                opia
              </text>
            </g>
            {/* the tree T */}
            <g stroke="#57422e" strokeWidth="3" strokeLinejoin="round">
              <path d="M178 316 L178 250 L192 250 L192 316 Z" fill="#8a5a2e" strokeWidth="4" />
              <path d="M178 282 q-12 -6 -16 -18 M192 276 q12 -6 16 -20" fill="none" stroke="#8a5a2e" strokeWidth="5" strokeLinecap="round" />
              <g fill="#5f8a4a">
                <ellipse cx="153" cy="234" rx="31" ry="20" />
                <ellipse cx="217" cy="232" rx="31" ry="20" />
                <ellipse cx="185" cy="214" rx="35" ry="22" />
              </g>
              <g fill="#78a35c" stroke="none">
                <ellipse cx="170" cy="222" rx="18" ry="11" />
                <ellipse cx="204" cy="218" rx="16" ry="10" />
              </g>
              <g fill="#ffd98f" stroke="none" opacity="0.6">
                <circle cx="153" cy="241" r="8" />
                <circle cx="216" cy="239" r="8" />
              </g>
              <g strokeWidth="2">
                <circle cx="153" cy="241" r="4.5" fill="#f0a94e" />
                <circle cx="216" cy="239" r="4.5" fill="#f0a94e" />
              </g>
            </g>
            {/* sparkles */}
            <g fill="#fdf6e8">
              <path d="M118 218 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
              <path d="M282 210 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" />
              <path d="M256 342 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
            </g>
            {/* subtitle */}
            <g transform="translate(195,362)">
              <rect x="-118" y="-15" width="236" height="30" rx="15" fill="#fdf6e8" stroke="#57422e" strokeWidth="2.5" />
              <text x="0" y="5" textAnchor="middle" style={{ font: '600 12.5px Figtree,sans-serif' }} fill="#57422e">
                small green habits · wild results
              </text>
            </g>
          </g>
          {/* moon moth fluttering by the logo */}
          <g className="anim-bob" style={{ animationDuration: '3.2s' }}>
            <g transform="translate(302,432)" stroke="#57422e" strokeWidth="2.2" strokeLinejoin="round">
              <path d="M-2 0 C-18 -10 -25 2 -17 8 C-10 13 -3 10 -2 3 C-3 13 -10 18 -15 16 C-7 23 0 17 0 7Z" fill="#cfe3c0" />
              <path d="M2 0 C18 -10 25 2 17 8 C10 13 3 10 2 3 C3 13 10 18 15 16 C7 23 0 17 0 7Z" fill="#bcd8ac" />
              <circle cx="-11" cy="2" r="2.8" fill="#e2b13c" strokeWidth="1.6" />
              <circle cx="11" cy="2" r="2.8" fill="#e2b13c" strokeWidth="1.6" />
              <ellipse cx="0" cy="5" rx="2.4" ry="6.5" fill="#f5efd8" />
            </g>
          </g>
          {/* cloud koi drifting */}
          <g className="anim-bob" style={{ animationDuration: '4s', animationDelay: '0.6s' }}>
            <g transform="translate(88,452)" stroke="#57422e" strokeWidth="2.5" strokeLinejoin="round">
              <g fill="#fff" strokeWidth="2.2" opacity="0.9">
                <ellipse cx="-16" cy="14" rx="11" ry="5.5" />
                <ellipse cx="12" cy="17" rx="9" ry="4.5" />
              </g>
              <path d="M-22 0 C-15 -9 4 -10 14 -3 C21 1 21 6 14 9 C4 14 -13 12 -20 5Z" fill="#f6f1e4" />
              <path d="M-20 3 q-9 -7 -14 -2 q4 7 11 5z" fill="#e88a5d" />
              <ellipse cx="3" cy="-5" rx="8" ry="4" fill="#e88a5d" stroke="none" />
              <circle cx="14" cy="0" r="1.9" fill="#201e1d" stroke="none" />
              <path d="M26 -14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff" stroke="none" />
            </g>
          </g>
          {/* meadow flora */}
          <g stroke="#57422e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {/* torch ginger left */}
            <g transform="translate(52,612)">
              <path d="M0 34 q-2 -22 -6 -30 M16 34 q0 -26 2 -32 M30 34 q2 -20 8 -26" fill="none" stroke="#4f7a42" strokeWidth="4" />
              <g fill="#c67139">
                <ellipse cx="-7" cy="0" rx="7" ry="11.5" />
                <ellipse cx="18" cy="-6" rx="7.5" ry="12" />
                <ellipse cx="38" cy="4" rx="6.5" ry="10" />
              </g>
              <g fill="#eab54e" strokeWidth="2">
                <ellipse cx="-7" cy="-6" rx="3.2" ry="4" />
                <ellipse cx="18" cy="-12.5" rx="3.5" ry="4.5" />
                <ellipse cx="38" cy="-1" rx="3" ry="3.6" />
              </g>
            </g>
            {/* honeycomb bloom */}
            <g transform="translate(120,700)">
              <path d="M0 24 L0 6" stroke="#4f7a42" strokeWidth="3.5" fill="none" />
              <path d="M0 -14 L9 -9 L9 1 L0 6 L-9 1 L-9 -9Z" fill="#e2a23c" strokeWidth="2.2" />
              <path d="M11 -1 L18 3 L18 11 L11 15 L4 11 L4 3Z" fill="#eab54e" strokeWidth="2.2" />
              <path d="M-11 -1 L-4 3 L-4 11 L-11 15 L-18 11 L-18 3Z" fill="#eab54e" strokeWidth="2.2" />
            </g>
            {/* pond + cattails right */}
            <path d="M258 740 C256 718 286 706 318 710 C352 715 370 728 366 748 C362 768 328 776 298 772 C272 768 260 758 258 740Z" fill="#a5cdd6" strokeWidth="3" />
            <path d="M282 736 C282 726 300 720 318 723 C338 726 348 734 346 743 C344 753 326 758 308 755 C292 752 282 745 282 736Z" fill="#cbe4e8" stroke="none" />
            <g transform="translate(354,700)">
              <path d="M0 34 L-2 -12 M14 36 L16 -4 M-12 36 L-14 4" fill="none" stroke="#4f7a42" strokeWidth="3.5" />
              <rect x="-7" y="-28" width="10" height="23" rx="5" fill="#8a5a2e" strokeWidth="2.2" />
              <rect x="11" y="-18" width="9" height="19" rx="4.5" fill="#a9713d" strokeWidth="2.2" />
              <path d="M-14 4 q-10 -14 -6 -26" fill="none" stroke="#4f7a42" strokeWidth="3" />
            </g>
            {/* mushrooms */}
            <g transform="translate(30,760)">
              <rect x="-3" y="-2" width="6" height="10" rx="3" fill="#f5efd8" strokeWidth="2.2" />
              <path d="M-10 -2 A10 8 0 0 1 10 -2 Z" fill="#d96c5a" strokeWidth="2.2" />
              <circle cx="-4" cy="-6" r="1.6" fill="#fff" stroke="none" />
            </g>
            <g transform="translate(46,770) scale(0.8)">
              <rect x="-3" y="-2" width="6" height="10" rx="3" fill="#f5efd8" strokeWidth="2.2" />
              <path d="M-10 -2 A10 8 0 0 1 10 -2 Z" fill="#e2836f" strokeWidth="2.2" />
            </g>
          </g>
          {/* CHARACTERS gathered up front */}
          {/* otter with leaf umbrella, center */}
          <g transform="translate(172,676)" stroke="#57422e" strokeWidth="2.5" strokeLinejoin="round">
            <ellipse cx="0" cy="36" rx="30" ry="7" fill="rgba(0,0,0,.1)" stroke="none" />
            <path d="M24 14 q17 4 19 -9" fill="none" strokeWidth="7.5" stroke="#57422e" strokeLinecap="round" />
            <path d="M24 14 q17 4 19 -9" fill="none" strokeWidth="4" stroke="#9c6b40" strokeLinecap="round" />
            <ellipse cx="0" cy="16" rx="24" ry="18" fill="#9c6b40" />
            <ellipse cx="0" cy="20" rx="14" ry="11" fill="#dfc094" stroke="none" />
            <circle cx="0" cy="-10" r="17" fill="#9c6b40" />
            <circle cx="-12" cy="-22" r="4.8" fill="#9c6b40" />
            <circle cx="12" cy="-22" r="4.8" fill="#9c6b40" />
            <ellipse cx="0" cy="-5" rx="9.5" ry="7.5" fill="#dfc094" stroke="none" />
            <circle cx="-6.5" cy="-12" r="2.8" fill="#201e1d" stroke="none" />
            <circle cx="6.5" cy="-12" r="2.8" fill="#201e1d" stroke="none" />
            <circle cx="-5.5" cy="-13" r="1.1" fill="#fff" stroke="none" />
            <circle cx="7.5" cy="-13" r="1.1" fill="#fff" stroke="none" />
            <ellipse cx="0" cy="-7" rx="2.8" ry="2.2" fill="#57422e" stroke="none" />
            <path d="M0 -5 q-2.5 3 -5.5 1 M0 -5 q2.5 3 5.5 1" fill="none" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="-12" cy="-6" rx="3.2" ry="2.2" fill="#f0b5a0" stroke="none" />
            <ellipse cx="12" cy="-6" rx="3.2" ry="2.2" fill="#f0b5a0" stroke="none" />
            <path d="M-17 7 L-28 -22" strokeWidth="3.5" strokeLinecap="round" />
            <g transform="translate(-28,-26)">
              <path d="M0 0 C-17 -2 -21 -15 -13 -21 C-2 -26 13 -19 13 -8 C11 -2 6 1 0 0Z" fill="#8fae62" />
              <path d="M-13 -19 Q0 -13 11 -6" fill="none" strokeWidth="1.8" />
            </g>
          </g>
          {/* pangolin curled, right of otter */}
          <g transform="translate(268,700)" stroke="#57422e" strokeWidth="2.5" strokeLinejoin="round">
            <ellipse cx="0" cy="20" rx="24" ry="5.5" fill="rgba(0,0,0,.1)" stroke="none" />
            <circle cx="0" cy="0" r="19" fill="#c99a63" />
            <g fill="#a9713d">
              <path d="M-12 -12 q7 -5 12 0 q-5 7 -12 0z" />
              <path d="M2 -15 q7 -4 11 1 q-4 6 -11 -1z" />
              <path d="M-17 2 q6 -6 12 -1 q-4 7 -12 1z" />
              <path d="M10 -5 q7 -3 10 2 q-4 6 -10 -2z" />
            </g>
            <circle cx="9" cy="10" r="7.5" fill="#e0bd8d" />
            <path d="M6 9 q2 2 4 0 M11 10 q2 2 4 0" fill="none" strokeWidth="1.6" strokeLinecap="round" />
            <ellipse cx="15.5" cy="12" rx="1.8" ry="1.4" fill="#57422e" stroke="none" />
          </g>
          {/* kingfisher on the pond edge */}
          <g transform="translate(318,688)" stroke="#57422e" strokeWidth="2.5" strokeLinejoin="round">
            <ellipse cx="0" cy="10" rx="13" ry="11" fill="#4f8fb0" />
            <ellipse cx="0" cy="13" rx="8" ry="6" fill="#eeb877" stroke="none" />
            <circle cx="0" cy="-7" r="10.5" fill="#4f8fb0" />
            <path d="M-5 -16 L-3.5 -23 M0 -17 L0 -25 M5 -16 L3.5 -23" fill="none" strokeWidth="3" strokeLinecap="round" stroke="#3d7492" />
            <path d="M9 -9 L19 -7 L9 -3.5Z" fill="#201e1d" />
            <circle cx="-3.5" cy="-8" r="2.1" fill="#201e1d" stroke="none" />
            <circle cx="4" cy="-8" r="2.1" fill="#201e1d" stroke="none" />
            <circle cx="-2.8" cy="-8.8" r="0.8" fill="#fff" stroke="none" />
            <circle cx="4.7" cy="-8.8" r="0.8" fill="#fff" stroke="none" />
          </g>
          {/* sun sparrow left */}
          <g transform="translate(96,672)" stroke="#57422e" strokeWidth="2.5" strokeLinejoin="round">
            <ellipse cx="0" cy="20" rx="13" ry="4" fill="rgba(0,0,0,.08)" stroke="none" />
            <ellipse cx="0" cy="6" rx="13" ry="11" fill="#c8a06a" />
            <ellipse cx="0" cy="9" rx="8" ry="6" fill="#efdcb4" stroke="none" />
            <circle cx="0" cy="-9" r="10.5" fill="#c8a06a" />
            <path d="M-3 -19 q3 -5 6 0" fill="none" strokeLinecap="round" />
            <path d="M9 -10 L16 -8 L9 -5Z" fill="#e2a23c" />
            <circle cx="-4" cy="-10" r="2.1" fill="#201e1d" stroke="none" />
            <circle cx="4" cy="-10" r="2.1" fill="#201e1d" stroke="none" />
            <ellipse cx="-7.5" cy="-5" rx="2.4" ry="1.6" fill="#f0b5a0" stroke="none" />
            <ellipse cx="7.5" cy="-5" rx="2.4" ry="1.6" fill="#f0b5a0" stroke="none" />
          </g>
          {/* fireflies */}
          <g fill="#ffe9a8" stroke="none" opacity="0.9" className="anim-twinkle">
            <circle cx="140" cy="560" r="3" />
            <circle cx="252" cy="540" r="2.6" />
            <circle cx="70" cy="520" r="2.4" />
            <circle cx="330" cy="640" r="2.6" />
          </g>
          <g fill="#fff" stroke="none">
            <path d="M60 420 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" opacity="0.9" />
            <path d="M300 470 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" opacity="0.9" />
          </g>
        </svg>
        {/* loading bar — the live part */}
        <div style={{ position: 'absolute', left: 26, right: 26, bottom: 30, display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'center' }}>
          <div style={{ width: '100%', height: 32, borderRadius: 999, background: '#fdf6e8', border: '3px solid #57422e', boxShadow: '0 3px 0 rgba(87,66,46,.4)', padding: 4, boxSizing: 'border-box' }}>
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(180deg,#a4c274,#7d9c52)',
                border: '2px solid #4f6a3c',
                boxSizing: 'border-box',
                transition: 'width 90ms linear',
              }}
            />
          </div>
          <div style={{ font: '700 11.5px/1 Figtree,sans-serif', color: '#57422e', background: 'rgba(253,246,232,.9)', border: '2px solid #57422e', borderRadius: 999, padding: '7px 13px' }}>
            Growing your garden… {pct}% · {TIPS[tip]}
          </div>
        </div>
      </div>
    </div>
  );
}

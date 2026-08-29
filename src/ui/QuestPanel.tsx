/**
 * QuestPanel ("Missions") — the government poster made playable (scheme §10),
 * styled per the design's missions board: bordered mission cards with an
 * icon square, tier chips, a parcel on the right, and the "stronger
 * evidence, better parcel" explainer. Evidence scales rewards, never gates
 * them (ECONOMY.md §5).
 */
import { useRef, useState } from 'react';
import {
  DAILY_QUEST_COINS,
  BENCHMARK_QUEST_COINS,
  EVIDENCE_MULTIPLIER,
  MAGIC_SEED_BY_EVIDENCE,
  NATIONAL_REFERENCE,
  PACKAGE_CAPS,
  type EvidenceTier,
} from '../config/balance';
import { SHOWER } from '../config/balance';
import { BENCHMARK_QUESTS, DAILY_QUESTS, MAGIC_SEED_RARITY, SHOWER_MISSION } from '../config/content';
import { ShowerTimer } from './ShowerTimer';
import { dayOf, periodOf } from '../engine/clock';
import { isDoneThisPeriod } from '../engine/quests';
import { CameraCapture } from '../capture/CameraCapture';
import { readBill, type BillKind } from '../capture/billOcr';
import { TransportConnect } from './TransportConnect';
import { useStore } from '../state/store';
import { Sprite } from './art';
import { Coin } from './GardenScene';
import { Card, SectionTitle } from './Panels';

type CaptureTask =
  | { kind: 'daily'; questId: keyof typeof DAILY_QUEST_COINS; tier: EvidenceTier }
  | { kind: 'label'; questId: 'appliance_4_ticks' | 'fitting_2_ticks' };

export function QuestPanel() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const completeDaily_ = useStore((s) => s.completeDaily_);
  const submitLabel_ = useStore((s) => s.submitLabel_);
  const [capture, setCapture] = useState<CaptureTask | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const today = dayOf(now);
  const doneCount = DAILY_QUESTS.filter((q) => !q.auto && game.quests.dailies[q.id]?.day === today).length;

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <span className="ds-pill bg-leaf/15 px-3 py-1 text-xs font-bold text-leaf-deep">
          {doneCount} of {DAILY_QUESTS.filter((q) => !q.auto).length} today
        </span>
        <span className="text-[11px] font-semibold opacity-60">
          Magic seeds today: {game.quests.packagesDay === today ? game.quests.packagesFromDailies : 0}/
          {PACKAGE_CAPS.maxPerDayFromDailyQuests}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {DAILY_QUESTS.map((q) => {
          const done = game.quests.dailies[q.id]?.day === today;
          const completion = game.quests.dailies[q.id];
          const base = DAILY_QUEST_COINS[q.id];
          return (
            <Card key={q.id} className={done ? 'opacity-85' : ''}>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-cream">
                  <Sprite id={q.icon} size={30} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{q.name}</div>
                  <div className="text-[10px] opacity-50">{q.guideline}</div>
                  {done ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Chip tone="tan">
                        {completion!.tier === 1 ? 'DECLARED' : completion!.tier === 2 ? 'PHOTO' : 'PAIRED PHOTO'} · TIER{' '}
                        {completion!.tier}
                      </Chip>
                      <Chip tone="green">DONE ✓ +{completion!.coins}</Chip>
                    </div>
                  ) : q.auto ? (
                    <p className="mt-1 text-[11px] opacity-60">Completes itself when you show up. That's the point.</p>
                  ) : q.connect ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <TierBtn onClick={() => completeDaily_(q.id, 1)}>
                        Declared · <Coin n={Math.round(base * EVIDENCE_MULTIPLIER[1])} />
                      </TierBtn>
                      <TierBtn tone="gold" onClick={() => setConnectOpen(true)}>
                        <Sprite id="icon_location" size={14} /> Connect tracker · <Coin n={Math.round(base * EVIDENCE_MULTIPLIER[3])} />
                      </TierBtn>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <TierBtn onClick={() => completeDaily_(q.id, 1)}>
                        Declared · <Coin n={Math.round(base * EVIDENCE_MULTIPLIER[1])} />
                      </TierBtn>
                      {q.tiers.includes(2) && (
                        <TierBtn tone="blue" onClick={() => setCapture({ kind: 'daily', questId: q.id, tier: 2 })}>
                          <Sprite id="icon_camera" size={14} /> Photo · <Coin n={Math.round(base * EVIDENCE_MULTIPLIER[2])} />
                        </TierBtn>
                      )}
                      {q.tiers.includes(3) && (
                        <TierBtn tone="gold" onClick={() => setCapture({ kind: 'daily', questId: q.id, tier: 3 })}>
                          <Sprite id="icon_camera" size={14} /> Paired · <Coin n={Math.round(base * EVIDENCE_MULTIPLIER[3])} />
                        </TierBtn>
                      )}
                    </div>
                  )}
                </div>
                {!q.auto && (
                  <div className="flex shrink-0 flex-col items-center">
                    <span
                      className={done ? undefined : 'opacity-70'}
                      style={{ filter: `drop-shadow(0 0 5px ${MAGIC_SEED_RARITY[MAGIC_SEED_BY_EVIDENCE[(completion?.tier ?? Math.max(...q.tiers)) as EvidenceTier]].glow})` }}
                    >
                      <Sprite id="magic_seed" size={34} />
                    </span>
                    {done && <span className="text-[9px] font-bold text-leaf-deep">grown!</span>}
                  </div>
                )}
                {done && q.auto && <Sprite id="icon_check" size={24} />}
              </div>
            </Card>
          );
        })}
      </div>

      {/* the live-timer shower mission */}
      <div className="mt-2">
        <ShowerCard />
      </div>

      {/* stronger evidence, better magic seed */}
      <Card className="mt-3">
        <div className="text-sm font-bold">Stronger evidence, better magic seed</div>
        <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
          <EvidenceCell label="1 · Declared" sub="common" tone="tan" rarity="common" />
          <EvidenceCell label="2 · Photo" sub="common" tone="blue" rarity="common" />
          <EvidenceCell label="3 · Paired" sub="rare" tone="gold" rarity="rare" />
          <EvidenceCell label="4 · Peer" sub="epic" tone="dashed" rarity="epic" />
        </div>
      </Card>

      <SectionTitle>Benchmarks — once per billing period</SectionTitle>
      <BaselineCard />
      <div className="mt-2 flex flex-col gap-2">
        <WaterBillCard />
        <ElectricityBillCard />
        {BENCHMARK_QUESTS.filter((q) => q.kind === 'label_photo').map((q) => {
          const done = isDoneThisPeriod(game, q.id, now);
          return (
            <Card key={q.id}>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-cream">
                  <Sprite id={q.icon} size={30} />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-bold">{q.name}</div>
                  <div className="text-[10px] opacity-50">{q.benchmark}</div>
                </div>
                {done ? <Sprite id="icon_check" size={26} /> : <Sprite id="magic_seed" size={30} className="opacity-80" />}
              </div>
              {done ? (
                <p className="mt-1.5 text-xs font-semibold text-leaf-deep">Done this period.</p>
              ) : (
                <div className="mt-2">
                  <TierBtn
                    tone="gold"
                    onClick={() => setCapture({ kind: 'label', questId: q.id as 'appliance_4_ticks' | 'fitting_2_ticks' })}
                  >
                    <Sprite id="icon_camera" size={14} /> Photograph the label · <Coin n={BENCHMARK_QUEST_COINS[q.id]} />
                  </TierBtn>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {connectOpen && (
        <TransportConnect
          onVerified={() => {
            setConnectOpen(false);
            completeDaily_('green_transport', 3);
          }}
          onClose={() => setConnectOpen(false)}
        />
      )}

      {capture && (
        <CameraCapture
          mode={capture.kind === 'daily' && capture.tier === 3 ? 'paired' : 'single'}
          title={capture.kind === 'label' ? 'Efficiency label' : DAILY_QUESTS.find((q) => q.id === capture.questId)!.name}
          ocrMissionId={capture.questId}
          onDone={(result) => {
            setCapture(null);
            if (!result) return;
            if (capture.kind === 'daily') {
              // OCR-gated photo that couldn't verify → drop to Declared (tier 1).
              const tier = result.declaredFallback ? 1 : capture.tier;
              completeDaily_(capture.questId, tier, result.hash);
            } else {
              // Label benchmarks: only accept a verified scan (no fallback here).
              if (result.declaredFallback || !result.hash) return;
              submitLabel_(capture.questId, result.hash);
            }
          }}
        />
      )}
    </>
  );
}

const CHIP_TONES: Record<string, string> = {
  tan: 'bg-sun/25 text-ink',
  green: 'bg-leaf/20 text-leaf-deep',
  blue: 'bg-pond-pale text-ink',
  gold: 'bg-sun/45 text-ink',
};

function Chip({ children, tone = 'tan' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${CHIP_TONES[tone]}`}>{children}</span>
  );
}

function ShowerCard() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const startShower_ = useStore((s) => s.startShower_);
  const [open, setOpen] = useState(false);

  const running = game.shower.startedAt !== null;
  const doneToday = game.shower.lastDoneDay === dayOf(now);

  return (
    <>
      <Card className="border-pond/50 bg-pond-pale/30">
        <div className="flex items-center gap-3">
          <span className="border-ink bg-cream flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2">
            <Sprite id={SHOWER_MISSION.icon} size={30} />
          </span>
          <div className="flex-1">
            <div className="text-sm font-bold">{SHOWER_MISSION.name}</div>
            <div className="text-[10px] opacity-50">{SHOWER_MISSION.guideline}</div>
          </div>
          <span className="opacity-80" style={{ filter: `drop-shadow(0 0 5px ${MAGIC_SEED_RARITY.rare.glow})` }}>
            <Sprite id="magic_seed" size={30} />
          </span>
        </div>
        {doneToday ? (
          <p className="text-leaf-deep mt-1.5 text-xs font-semibold">Done today — nice and quick.</p>
        ) : (
          <div className="mt-2">
            <TierBtn
              tone="blue"
              onClick={() => {
                if (!running) startShower_();
                setOpen(true);
              }}
            >
              <Sprite id="icon_shower" size={14} /> {running ? 'Resume timer' : `Start ${SHOWER.durationSec / 60}-min timer`} · <Coin n={SHOWER.coins} /> + rare seed
            </TierBtn>
          </div>
        )}
      </Card>
      {open && <ShowerTimer onClose={() => setOpen(false)} />}
    </>
  );
}

function EvidenceCell({ label, sub, tone, rarity }: { label: string; sub: string; tone: string; rarity: keyof typeof MAGIC_SEED_RARITY }) {
  const bg = { tan: 'bg-cream border-ink/20', blue: 'bg-pond-pale border-ink/20', gold: 'bg-sun/35 border-ink/25', dashed: 'border-dashed border-ink/25' }[tone];
  return (
    <div className={`rounded-xl border-2 p-1.5 ${bg}`}>
      <div className="text-[9px] leading-3 font-bold">{label}</div>
      <span style={{ filter: `drop-shadow(0 0 4px ${MAGIC_SEED_RARITY[rarity].glow})` }}>
        <Sprite id="magic_seed" size={22} className={tone === 'dashed' ? 'opacity-40' : undefined} />
      </span>
      <div className="text-[8px] font-bold" style={{ color: MAGIC_SEED_RARITY[rarity].color }}>
        {sub}
      </div>
    </div>
  );
}

function TierBtn({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'blue' | 'gold';
}) {
  const cls =
    tone === 'gold'
      ? 'bg-sun/50 hover:bg-sun/70'
      : tone === 'blue'
        ? 'bg-pond-pale hover:brightness-95'
        : 'bg-cream hover:bg-wall';
  return (
    <button className={`ds-pill flex items-center gap-1 px-2.5 py-1.5 text-xs ${cls}`} onClick={onClick}>
      {children}
    </button>
  );
}

/* ── the measurement instrument ───────────────────────────────────── */

function BaselineCard() {
  const game = useStore((s) => s.game);
  const b = game.baseline;
  const waterSubs = game.quests.benchmarks.water_under_130L?.submissions ?? [];
  const elecSubs = game.quests.benchmarks.electricity_under_average?.submissions ?? [];

  return (
    <Card className="bg-pond-pale/40">
      <div className="flex items-center gap-1.5 text-sm font-bold">
        <Sprite id="icon_label" size={20} /> Your baseline
      </div>
      {!b ? (
        <p className="mt-1 text-xs opacity-70">
          Your first submitted bill of each type becomes your personal baseline. Every later bill plots
          against your own day-one figure — not a national average.
        </p>
      ) : (
        <div className="mt-1.5 flex flex-col gap-2">
          {b.waterLitresPerPersonPerDay !== undefined && (
            <Trend
              label="Water · L/person/day"
              baseline={b.waterLitresPerPersonPerDay}
              target={NATIONAL_REFERENCE.waterTargetLitresPerPersonPerDay}
              subs={waterSubs.map((s) => s.value)}
            />
          )}
          {b.electricityKwhPerMonth !== undefined && (
            <Trend
              label={`Electricity · kWh/month (${b.flatType})`}
              baseline={b.electricityKwhPerMonth}
              target={NATIONAL_REFERENCE.electricityKwhPerMonth[b.flatType ?? ''] ?? 0}
              subs={elecSubs.map((s) => s.value)}
            />
          )}
          <p className="text-[10px] opacity-50">
            Change is measured against your own first bill. Reference: {NATIONAL_REFERENCE.source}.
          </p>
        </div>
      )}
    </Card>
  );
}

/** Tiny bar trend: baseline drawn as a line, each submission a bar. */
function Trend({ label, baseline, target, subs }: { label: string; baseline: number; target: number; subs: number[] }) {
  const max = Math.max(baseline, target, ...subs) * 1.15;
  const w = 320;
  const h = 56;
  const bw = Math.min(34, w / Math.max(4, subs.length) - 8);
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold opacity-60">
        <span>{label}</span>
        <span>
          baseline {Math.round(baseline)} · target {Math.round(target)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-0.5 w-full">
        {subs.map((v, i) => {
          const bh = (v / max) * (h - 12);
          const under = v <= target;
          return (
            <g key={i}>
              <rect x={8 + i * (bw + 8)} y={h - bh} width={bw} height={bh} rx={4} fill={under ? '#7d9c52' : '#e88a5d'} />
              <text x={8 + i * (bw + 8) + bw / 2} y={h - bh - 3} fontSize={9} textAnchor="middle" fill="#57422e" opacity={0.7}>
                {Math.round(v)}
              </text>
            </g>
          );
        })}
        <line x1={0} x2={w} y1={h - (baseline / max) * (h - 12)} y2={h - (baseline / max) * (h - 12)} stroke="#57422e" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />
        <line x1={0} x2={w} y1={h - (target / max) * (h - 12)} y2={h - (target / max) * (h - 12)} stroke="#4f7a42" strokeWidth={1.5} strokeDasharray="2 3" opacity={0.7} />
      </svg>
    </div>
  );
}

function WaterBillCard() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const submitWater_ = useStore((s) => s.submitWater_);
  const toast = useStore((s) => s.toast);
  const [m3, setM3] = useState('');
  const [household, setHousehold] = useState('');
  const [days, setDays] = useState('30');
  const [photoHash, setPhotoHash] = useState<string | null>(null);
  const done = isDoneThisPeriod(game, 'water_under_130L', now);
  const q = BENCHMARK_QUESTS.find((b) => b.id === 'water_under_130L')!;

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-cream">
          <Sprite id={q.icon} size={30} />
        </span>
        <div className="flex-1">
          <div className="text-sm font-bold">{q.name}</div>
          <div className="text-[10px] opacity-50">{q.benchmark}</div>
        </div>
        {done ? <Sprite id="icon_check" size={26} /> : <Sprite id="magic_seed" size={32} className="opacity-85" />}
      </div>
      {done ? (
        <p className="mt-1.5 text-xs font-semibold text-leaf-deep">Submitted this period ({periodOf(now)}).</p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <LabeledInput label="m³ used" value={m3} onChange={setM3} placeholder="4.2" />
            <LabeledInput label="people" value={household} onChange={setHousehold} placeholder="4" />
            <LabeledInput label="days" value={days} onChange={setDays} placeholder="30" />
          </div>
          <BillPhotoUpload hash={photoHash} onHash={setPhotoHash} kind="water" onExtract={(v) => setM3(String(v))} />
          <div className="mt-2">
            <TierBtn
              tone="gold"
              onClick={() => {
                const r = submitWater_({ cubicMetres: +m3, householdSize: +household, days: +days }, photoHash ?? undefined);
                if (r.ok) {
                  setPhotoHash(null);
                  toast(
                    r.met ? 'icon_wizard_hat' : 'icon_label',
                    r.met
                      ? 'Under 130 L — the Wizard is coming!'
                      : `Recorded${r.baselineCaptured ? ' as your baseline' : ''}. Under 130 L summons the Wizard.`,
                  );
                }
              }}
            >
              Submit bill · <Coin n={BENCHMARK_QUEST_COINS.water_under_130L} /> if under target
            </TierBtn>
          </div>
          <p className="mt-1 text-[10px] opacity-50">
            From your PUB bill — type the figures, and attach a photo of the bill if you like. Only the
            derived figure and a photo fingerprint are stored — never the document.
          </p>
        </>
      )}
    </Card>
  );
}

function ElectricityBillCard() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const submitElectricity_ = useStore((s) => s.submitElectricity_);
  const toast = useStore((s) => s.toast);
  const [kwh, setKwh] = useState('');
  const [flat, setFlat] = useState('4-room');
  const [photoHash, setPhotoHash] = useState<string | null>(null);
  const done = isDoneThisPeriod(game, 'electricity_under_average', now);
  const q = BENCHMARK_QUESTS.find((b) => b.id === 'electricity_under_average')!;
  const avg = NATIONAL_REFERENCE.electricityKwhPerMonth[flat];

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-cream">
          <Sprite id={q.icon} size={30} />
        </span>
        <div className="flex-1">
          <div className="text-sm font-bold">{q.name}</div>
          <div className="text-[10px] opacity-50">
            {q.benchmark} — {flat}: {avg} kWh
          </div>
        </div>
        {done ? <Sprite id="icon_check" size={26} /> : <Sprite id="magic_seed" size={32} className="opacity-85" />}
      </div>
      {done ? (
        <p className="mt-1.5 text-xs font-semibold text-leaf-deep">Submitted this period ({periodOf(now)}).</p>
      ) : (
        <>
          <div className="mt-2 flex gap-1.5">
            <LabeledInput label="kWh this month" value={kwh} onChange={setKwh} placeholder="310" />
            <label className="flex-1 text-[10px] font-bold uppercase opacity-60">
              flat type
              <select
                className="mt-0.5 w-full rounded-lg border-2 border-ink/20 bg-paper px-2 py-1.5 text-sm font-semibold text-ink normal-case"
                value={flat}
                onChange={(e) => setFlat(e.target.value)}
              >
                {Object.keys(NATIONAL_REFERENCE.electricityKwhPerMonth).map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
          <BillPhotoUpload hash={photoHash} onHash={setPhotoHash} kind="electricity" onExtract={(v) => setKwh(String(v))} />
          <div className="mt-2">
            <TierBtn
              tone="gold"
              onClick={() => {
                const r = submitElectricity_({ kwh: +kwh, flatType: flat }, photoHash ?? undefined);
                if (r.ok) {
                  setPhotoHash(null);
                  toast(
                    r.met ? 'icon_wizard_hat' : 'icon_label',
                    r.met
                      ? 'Under your flat-type average — the Wizard is coming!'
                      : `Recorded${r.baselineCaptured ? ' as your baseline' : ''}. Beat ${avg} kWh to summon the Wizard.`,
                  );
                }
              }}
            >
              Submit bill · <Coin n={BENCHMARK_QUEST_COINS.electricity_under_average} /> if under average
            </TierBtn>
          </div>
          <p className="mt-1 text-[10px] opacity-50">
            From your SP bill — enter the kWh, and attach a photo of the bill if you like. Only the figure
            and a photo fingerprint are stored — never the document.
          </p>
        </>
      )}
    </Card>
  );
}

/**
 * Optional bill-photo upload for the water/electricity benchmark quests. On
 * pick, the image is read on-device into a perceptual hash (never storing the
 * image, so a bill can't be silently resubmitted) AND run through Tesseract to
 * extract the figure the quest needs (kWh / m³), which pre-fills the field —
 * the player still confirms it. Bills-only: camera-verified quests still use
 * the live stream and never expose a file picker.
 */
function BillPhotoUpload({
  hash,
  onHash,
  kind,
  onExtract,
}: {
  hash: string | null;
  onHash: (h: string | null) => void;
  kind: BillKind;
  onExtract: (value: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [read, setRead] = useState<number | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setRead(null);
    try {
      const { hash: h, value } = await readBill(file, kind);
      onHash(h);
      if (value !== null) {
        setRead(value);
        onExtract(value);
      }
    } catch {
      setErr('Could not read that image — try another file.');
      onHash(null);
    } finally {
      setBusy(false);
    }
  };

  const unit = kind === 'electricity' ? 'kWh' : 'm³';

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {hash ? (
        <div className="border-leaf/50 bg-leaf/10 rounded-xl border-2 px-3 py-2 text-xs font-semibold text-leaf-deep">
          <div className="flex items-center gap-2">
            <Sprite id="icon_check" size={16} /> Bill photo attached
            <button
              className="ml-auto rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold hover:bg-wall"
              onClick={() => {
                onHash(null);
                setRead(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              remove
            </button>
          </div>
          <p className="mt-1 font-normal opacity-80">
            {read !== null
              ? `Read ${read} ${unit} from the bill — check it's right before submitting.`
              : `Couldn't read the ${unit} figure — please type it in.`}
          </p>
        </div>
      ) : (
        <button
          className="ds-pill flex w-full items-center justify-center gap-2 bg-cream px-4 py-2 text-xs font-bold hover:bg-wall disabled:opacity-60"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Sprite id="icon_camera" size={16} /> {busy ? 'Reading bill…' : 'Attach bill photo (optional)'}
        </button>
      )}
      {err && <p className="text-terra mt-1 text-[10px] font-semibold">{err}</p>}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex-1 text-[10px] font-bold uppercase opacity-60">
      {label}
      <input
        type="number"
        inputMode="decimal"
        className="mt-0.5 w-full rounded-lg border-2 border-ink/20 bg-paper px-2 py-1.5 text-sm font-semibold text-ink normal-case"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

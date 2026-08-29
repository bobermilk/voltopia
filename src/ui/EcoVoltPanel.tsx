/**
 * EcoVoltPanel — the EcoVolt tab. An "about" card for EcoVolt Technologies
 * (ecovolt.ai — "AI Building Orchestration System"), and the account-link flow:
 * once a player links their EcoVolt utility data, their real energy-saving
 * habits are read directly and more accurately, so quests verify automatically
 * instead of needing a photo or a declaration.
 *
 * The link is a mocked OAuth handshake for the hackathon (no real credentials);
 * real EcoVolt SSO is a P1 backend. The linked state is persisted.
 */
import { useState } from 'react';
import { useStore } from '../state/store';
import { Sprite } from './art';
import { Card, SectionTitle } from './Panels';

const SITE = 'https://ecovolt.ai';

export function EcoVoltPanel() {
  const linked = useStore((s) => s.game.ecovoltLinked);
  const setLinked = useStore((s) => s.setEcovoltLinked);
  const toast = useStore((s) => s.toast);
  const [busy, setBusy] = useState(false);

  const link = () => {
    if (busy || linked) return;
    setBusy(true);
    // Mocked handshake — real EcoVolt SSO is a backend task (P1).
    window.setTimeout(() => {
      setBusy(false);
      setLinked(true);
      toast('icon_bolt', 'EcoVolt linked — your utility data now verifies habits automatically.');
    }, 1300);
  };

  const unlink = () => {
    setLinked(false);
    toast('icon_block', 'EcoVolt account unlinked.');
  };

  return (
    <>
      {/* hero */}
      <div
        className="border-ink flex flex-col items-center rounded-2xl border-2 p-4 text-center text-cream"
        style={{ background: 'var(--color-night)' }}
      >
        <Sprite id="logo_ecovolt" size={72} />
        <div className="font-display mt-2 text-2xl text-cream">EcoVolt</div>
        <div className="text-sun text-xs font-semibold">AI Building Orchestration System</div>
        <a
          href={SITE}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-block rounded-full bg-cream/20 px-3 py-1 text-[11px] font-bold tracking-wide text-cream hover:bg-cream/30"
        >
          ecovolt.ai ↗
        </a>
      </div>

      <SectionTitle>About EcoVolt Technologies</SectionTitle>
      <Card>
        <p className="text-sm leading-5 opacity-80">
          EcoVolt Technologies builds an <b>AI Building Orchestration System</b> — software that reads a
          building's live energy data and coordinates how power is used across it, trimming waste and
          carbon while keeping everyone comfortable. Instead of guessing, EcoVolt turns real utility and
          sensor data into smarter, greener day-to-day operation.
        </p>
        <p className="mt-2 text-sm leading-5 opacity-80">
          Voltopia grows the same idea at home: small green habits, made visible and rewarding. EcoVolt
          is the utility-data engine that can stand behind it.
        </p>
      </Card>

      <SectionTitle>Link your utility data</SectionTitle>
      <Card className={linked ? 'border-leaf bg-leaf/10' : 'bg-leaf-mist/40'}>
        <div className="flex items-start gap-2">
          <Sprite id={linked ? 'icon_check' : 'icon_plug'} size={24} />
          <p className="flex-1 text-sm leading-5 opacity-80">
            Link your EcoVolt account and your real utility data flows straight into Voltopia. Your
            energy-saving habits are read <b>directly and more accurately</b> — so quests are verified
            automatically, with no photo to scan or action to declare.
          </p>
        </div>

        {linked ? (
          <>
            <div className="mt-3 flex items-center gap-2 rounded-xl border-2 border-leaf/50 bg-leaf/15 px-3 py-2 text-sm font-bold text-leaf-deep">
              <Sprite id="icon_bolt" size={18} /> Connected — habits verify from your utility data.
            </div>
            <button
              className="ds-pill mt-2 w-full bg-paper px-4 py-2 text-xs font-bold hover:bg-wall"
              onClick={unlink}
            >
              Unlink account
            </button>
          </>
        ) : (
          <button
            className="ds-pill mt-3 flex w-full items-center justify-center gap-2 bg-terra px-4 py-3 font-bold text-white shadow-md hover:brightness-105 disabled:opacity-60"
            onClick={link}
            disabled={busy}
          >
            <Sprite id="icon_bolt" size={20} />
            {busy ? 'Connecting to EcoVolt…' : 'Link EcoVolt system'}
          </button>
        )}
      </Card>

      <p className="mt-3 rounded-xl border-2 border-dashed border-ink/20 p-2.5 text-[11px] leading-4 opacity-70">
        Demo link for the hackathon — real EcoVolt single sign-on and live meter access ship with the
        backend. No credentials are entered here.
      </p>
    </>
  );
}

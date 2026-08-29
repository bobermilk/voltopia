/**
 * HUD — coins up top, the icon-only tree Tabs button opening the navigation
 * menu (Quests / Magic Seeds / Inventory / Shop / Field Guide / Social /
 * EcoVolt). All
 * dev controls live in the ladybug dev panel (top right). No garden tag
 * counters, no day counter — players see cause and effect through
 * creatures, not numbers.
 */
import { useState } from 'react';
import { waterAllPlan } from '../engine/plants';
import { dayOf } from '../engine/clock';
import { useStore, type Panel } from '../state/store';
import { Sprite } from './art';
import { Coin } from './GardenScene';

export function HUD() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const setPanel = useStore((s) => s.setPanel);
  const panel = useStore((s) => s.panel);
  const [menuOpen, setMenuOpen] = useState(false);

  const scale = game.clock.scale;
  const missionsLeft = 4 - ['aircon_25', 'fans_not_aircon', 'sockets_off', 'green_transport'].filter(
    (q) => game.quests.dailies[q]?.day === dayOf(now),
  ).length;

  const open = (p: Panel) => {
    setPanel(panel === p ? null : p);
    setMenuOpen(false);
  };

  return (
    <>
      {/* status row (the ladybug dev button renders from DevPanel, top right) */}
      <div className="pointer-events-none absolute top-3 right-16 left-3 z-20 flex items-center gap-2">
        <span className="ds-pill bg-paper pointer-events-auto flex items-center gap-1.5 py-1 pr-3 pl-1.5 text-sm">
          <Sprite id="icon_coin" size={20} /> {game.coins.toLocaleString()}
        </span>
        <div className="flex-1" />
        {scale !== 1 && (
          <span className="ds-pill bg-sun/40 pointer-events-auto flex items-center gap-1 px-2.5 py-1 text-xs">
            <Sprite id="icon_fast" size={14} /> ×{scale}
          </span>
        )}
      </div>

      {/* second row: the icon-only Tabs (tree) button */}
      <div className="absolute top-14 left-3 z-20 flex flex-col items-start gap-1.5">
        <button
          className={`border-ink flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-md transition-transform ${menuOpen ? 'bg-sun/60 rotate-12' : 'bg-paper hover:bg-cream'}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Tabs"
        >
          <Sprite id="icon_tree_menu" size={30} />
        </button>
        {menuOpen && (
          <div className="anim-pop flex flex-col items-start gap-1.5">
            <MenuButton label="Quests" icon="icon_quests" badge={missionsLeft || undefined} onClick={() => open('quests')} />
            <MenuButton label="Magic Seeds" icon="magic_seed" badge={game.magicSeeds?.length || undefined} onClick={() => open('magicseeds')} />
            <MenuButton label="Inventory" icon="icon_bag" onClick={() => open('inventory')} />
            <MenuButton label="Shop" icon="icon_seedpack" onClick={() => open('shop')} />
            <MenuButton label="Field Guide" icon="icon_book" onClick={() => open('guide')} />
            <MenuButton label="Social" icon="icon_social" onClick={() => open('social')} />
            <MenuButton label="EcoVolt" icon="logo_ecovolt" onClick={() => open('ecovolt')} />
          </div>
        )}
      </div>

      <WaterAllModal />
    </>
  );
}

function MenuButton({
  onClick,
  label,
  icon,
  badge,
  active,
}: {
  onClick: () => void;
  label: string;
  icon: string;
  badge?: number;
  active?: boolean;
}) {
  return (
    <button
      className={`ds-pill relative flex items-center gap-2 py-1.5 pr-4 pl-2 text-sm shadow-md ${active ? 'bg-sage text-white' : 'bg-paper hover:bg-cream'}`}
      onClick={onClick}
    >
      <Sprite id={icon} size={22} /> {label}
      {badge !== undefined && (
        <span className="bg-terra ring-paper absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2">
          {badge}
        </span>
      )}
    </button>
  );
}

/**
 * The confirmation ECONOMY.md insists on: shows the total before spending.
 * Waters only what's thirsty. Opened by long-pressing (or shift-clicking)
 * any plant.
 */
function WaterAllModal() {
  const open = useStore((s) => s.waterAllOpen);
  const setOpen = useStore((s) => s.setWaterAllOpen);
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const waterMany = useStore((s) => s.waterMany);

  if (!open) return null;
  const plan = waterAllPlan(game, now, true);
  const close = () => setOpen(false);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 p-5" onClick={close}>
      <div className="ds-card anim-pop w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display flex items-center gap-2 text-lg">
          <Sprite id="watering_can" size={30} /> Water everything?
        </h2>
        <p className="mt-1 text-sm opacity-75">
          {plan.plantIds.length} thirsty plant{plan.plantIds.length === 1 ? '' : 's'} · total <Coin n={plan.total} />
        </p>
        <div className="mt-4 flex gap-2">
          <button
            className="ds-pill bg-pond flex flex-1 items-center justify-center gap-1 px-4 py-2.5 font-bold text-white hover:brightness-105 disabled:opacity-40"
            disabled={plan.plantIds.length === 0 || game.coins < plan.total}
            onClick={() => {
              waterMany(plan.plantIds);
              close();
            }}
          >
            Water · <Coin n={plan.total} light />
          </button>
          <button className="ds-pill bg-cream hover:bg-wall px-4 py-2.5 font-bold" onClick={close}>
            Not now
          </button>
        </div>
        {game.coins < plan.total && (
          <p className="text-terra mt-2 text-xs font-semibold">Not enough coins — missions pay for water.</p>
        )}
        {plan.plantIds.length === 0 && <p className="mt-2 text-xs opacity-60">Nothing is thirsty right now.</p>}
      </div>
    </div>
  );
}

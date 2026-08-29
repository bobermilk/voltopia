/**
 * Panels — mobile bottom sheets. The tab set lives in the tree "Tabs" menu:
 * Shop · Missions · Inventory · Parcels · Field Guide · Social.
 */
import { useStore } from '../state/store';
import { Sprite } from './art';
import { EcoVoltPanel } from './EcoVoltPanel';
import { GuidePanel } from './GuidePanel';
import { InventoryPanel } from './InventoryPanel';
import { MagicSeedPanel } from './MagicSeedPanel';
import { QuestPanel } from './QuestPanel';
import { ShopPanel } from './ShopPanel';
import { SocialPanel } from './SocialPanel';

const TITLES = {
  inventory: { label: 'Inventory', icon: 'icon_bag' },
  magicseeds: { label: 'Magic Seeds', icon: 'magic_seed' },
  guide: { label: 'Field Guide', icon: 'icon_book' },
  quests: { label: 'Quests', icon: 'icon_quests' },
  shop: { label: 'Shop', icon: 'icon_seedpack' },
  social: { label: 'Social', icon: 'icon_social' },
  ecovolt: { label: 'EcoVolt', icon: 'logo_ecovolt' },
} as const;

export function Panels() {
  const panel = useStore((s) => s.panel);
  const setPanel = useStore((s) => s.setPanel);
  if (!panel) return null;
  const t = TITLES[panel];

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/25" onClick={() => setPanel(null)}>
      <div
        className="anim-sheet flex h-[86%] flex-col rounded-t-[2rem] border-x-2 border-t-2 border-ink bg-cream shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-ink/25" />
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <h1 className="font-display flex items-center gap-2 text-xl">
            <Sprite id={t.icon} size={28} /> {t.label}
          </h1>
          <button
            className="ds-pill bg-paper px-3 py-1 text-sm hover:bg-wall"
            onClick={() => setPanel(null)}
          >
            ✕
          </button>
        </div>
        <div className="panel-scroll flex-1 overflow-y-auto px-4 pb-6">
          {panel === 'inventory' && <InventoryPanel />}
          {panel === 'magicseeds' && <MagicSeedPanel />}
          {panel === 'shop' && <ShopPanel />}
          {panel === 'guide' && <GuidePanel />}
          {panel === 'quests' && <QuestPanel />}
          {panel === 'social' && <SocialPanel />}
          {panel === 'ecovolt' && <EcoVoltPanel />}
        </div>
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-5 mb-2 text-xs font-bold tracking-widest uppercase opacity-50 first:mt-0">{children}</h2>;
}

export function Card({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`ds-card p-3 ${className}`} style={style}>
      {children}
    </div>
  );
}

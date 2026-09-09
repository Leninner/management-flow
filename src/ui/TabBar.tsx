import { Menu, Package, ShoppingBag, type LucideIcon } from 'lucide-react'
import { cx } from './cx'
import type { Screen } from './navigation'

export const TAB_BAR_HEIGHT = 78

interface Tab {
  screen: Screen
  label: string
  icon: LucideIcon
}

/**
 * Three destinations, no nested menus.
 *
 * Writing a pedido is not among them: it opens from Pedidos and closes again,
 * because it is something she does rather than somewhere she is.
 */
const TABS: readonly Tab[] = [
  { screen: 'orders', label: 'Pedidos', icon: ShoppingBag },
  { screen: 'oriflame', label: 'Oriflame', icon: Package },
  { screen: 'more', label: 'Más', icon: Menu },
]

export interface TabBarProps {
  screen: Screen
  onSelect: (screen: Screen) => void
  /** Red count over a tab icon. Used for the things waiting today. */
  badges?: Partial<Record<Screen, number>>
}

export function TabBar({ screen, onSelect, badges }: TabBarProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-start">
        {TABS.map((tab) => (
          <TabButton
            key={tab.screen}
            tab={tab}
            active={screen === tab.screen}
            badge={badges?.[tab.screen]}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </nav>
  )
}

function TabButton({
  tab: { screen, label, icon: Icon },
  active,
  badge,
  onSelect,
}: {
  tab: Tab
  active: boolean
  badge: number | undefined
  onSelect: (screen: Screen) => void
}) {
  return (
    <li className="flex-1">
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={() => onSelect(screen)}
        className={cx(
          'flex w-full flex-col items-center justify-start gap-1 pt-3 pb-2',
          // The browser ring is a rectangle across the whole tab and reads as
          // a bug next to the round targets around it.
          'rounded-2xl outline-offset-[-6px] focus-visible:outline-2 focus-visible:outline-brand',
          active ? 'text-brand' : 'text-muted',
        )}
        style={{ minHeight: TAB_BAR_HEIGHT }}
      >
        <span className="relative">
          <Icon size={25} strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
          {badge !== undefined && badge > 0 && (
            <span className="money absolute -top-1.5 -right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-owes px-1 text-[0.8125rem] font-bold text-white tabular-nums">
              {badge}
            </span>
          )}
        </span>
        <span className={cx('text-[0.75rem]', active ? 'font-semibold' : 'font-medium')}>
          {label}
        </span>
      </button>
    </li>
  )
}

import { Home, Menu, Plus, ShoppingBag, Users, type LucideIcon } from 'lucide-react'
import { cx } from './cx'
import type { Screen } from './navigation'

export const TAB_BAR_HEIGHT = 78

/** Cuánto se levanta el botón de anotar por encima de la barra. */
export const CAPTURE_OVERHANG = 26

interface Tab {
  screen: Screen
  label: string
  icon: LucideIcon
}

/** Four destinations, no nested menus, split around the capture button. */
const LEFT: readonly Tab[] = [
  { screen: 'today', label: 'Hoy', icon: Home },
  { screen: 'orders', label: 'Pedidos', icon: ShoppingBag },
]

const RIGHT: readonly Tab[] = [
  { screen: 'customers', label: 'Clientes', icon: Users },
  { screen: 'more', label: 'Más', icon: Menu },
]

export interface TabBarProps {
  screen: Screen
  onSelect: (screen: Screen) => void
  /**
   * The raised button in the middle. Capturing is the only thing she does
   * under time pressure, so it sits under the thumb from every tab instead of
   * living inside one of them.
   */
  onCapture?: () => void
  /** Red count over a tab icon. Used for the things waiting today. */
  badges?: Partial<Record<Screen, number>>
}

export function TabBar({ screen, onSelect, onCapture, badges }: TabBarProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-start">
        {LEFT.map((tab) => (
          <TabButton
            key={tab.screen}
            tab={tab}
            active={screen === tab.screen}
            badge={badges?.[tab.screen]}
            onSelect={onSelect}
          />
        ))}

        {onCapture && (
          <li className="flex w-20 shrink-0 justify-center">
            <button
              type="button"
              onClick={onCapture}
              aria-label="Anotar pedido"
              className={cx(
                '-mt-6 flex h-16 w-16 items-center justify-center rounded-full',
                'bg-brand text-white shadow-lift transition-transform active:scale-95',
                'motion-reduce:transition-none',
              )}
            >
              <Plus size={32} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </li>
        )}

        {RIGHT.map((tab) => (
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
        <span className={cx('text-[0.75rem]', active ? 'font-semibold' : 'font-medium')}>{label}</span>
      </button>
    </li>
  )
}

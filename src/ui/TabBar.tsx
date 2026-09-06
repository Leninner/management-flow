import { Home, Menu, ShoppingBag, Users, type LucideIcon } from 'lucide-react'
import { cx } from './cx'
import type { Screen } from './navigation'

export const TAB_BAR_HEIGHT = 62

interface Tab {
  screen: Screen
  label: string
  icon: LucideIcon
}

/** Four destinations, no nested menus. */
const TABS: readonly Tab[] = [
  { screen: 'today', label: 'Hoy', icon: Home },
  { screen: 'orders', label: 'Pedidos', icon: ShoppingBag },
  { screen: 'customers', label: 'Clientes', icon: Users },
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ screen: target, label, icon: Icon }) => {
          const active = screen === target
          const badge = badges?.[target]
          return (
            <li key={target} className="flex-1">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelect(target)}
                className={cx(
                  'flex w-full flex-col items-center justify-center gap-0.5 pt-1.5 pb-1',
                  active ? 'text-brand' : 'text-muted',
                )}
                style={{ minHeight: TAB_BAR_HEIGHT }}
              >
                <span className="relative">
                  <span
                    className={cx(
                      'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                      active && 'bg-brand-soft',
                    )}
                  >
                    <Icon size={24} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                  </span>
                  {badge !== undefined && badge > 0 && (
                    <span className="money absolute -top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-owes px-1 text-[0.8125rem] font-bold text-white tabular-nums">
                      {badge}
                    </span>
                  )}
                </span>
                <span className={cx('text-[0.9375rem]', active ? 'font-bold' : 'font-medium')}>
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

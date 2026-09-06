import { ChevronLeft } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { cx } from './cx'
import type { Screen } from './navigation'
import { TAB_BAR_HEIGHT, TabBar } from './TabBar'

const ACTION_BAR_HEIGHT = 96

interface ActionSlot {
  node: HTMLElement | null
  /** Called by a floating BigButton so the shell can reserve room for it. */
  claim: () => () => void
}

const ActionSlotContext = createContext<ActionSlot | null>(null)

export function useActionSlot(): ActionSlot | null {
  return useContext(ActionSlotContext)
}

export interface AppShellProps {
  screen: Screen
  onSelectTab: (screen: Screen) => void
  children: ReactNode
  /**
   * Only pushed detail views get a title bar. A tab does not: the tab bar
   * already says where you are, and the header would eat a thumb of screen.
   */
  title?: string
  onBack?: () => void
  /** A single control on the right of the title bar. */
  headerAction?: ReactNode
  badges?: Partial<Record<Screen, number>>
}

export function AppShell({
  screen,
  onSelectTab,
  children,
  title,
  onBack,
  headerAction,
  badges,
}: AppShellProps) {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [claims, setClaims] = useState(0)

  const claim = useCallback(() => {
    setClaims((count) => count + 1)
    return () => setClaims((count) => count - 1)
  }, [])

  const slot = useMemo<ActionSlot>(() => ({ node, claim }), [node, claim])
  const hasAction = claims > 0

  return (
    <ActionSlotContext.Provider value={slot}>
      <div className="min-h-dvh bg-paper">
        {title && (
          <header
            className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="mx-auto flex min-h-14 max-w-lg items-center gap-1 px-1">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Volver"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink active:bg-brand-soft"
                >
                  <ChevronLeft size={28} aria-hidden="true" />
                </button>
              )}
              <h1 className={cx('flex-1 truncate text-xl font-bold', !onBack && 'px-3')}>{title}</h1>
              {headerAction && <div className="shrink-0 pr-1">{headerAction}</div>}
            </div>
          </header>
        )}

        <main
          className="mx-auto max-w-lg px-4"
          style={{
            // Installed on iOS the page runs under the status bar, so a tab
            // screen with no title bar has to keep clear of the notch itself.
            paddingTop: title ? undefined : 'calc(env(safe-area-inset-top) + 8px)',
            paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom) + ${
              hasAction ? ACTION_BAR_HEIGHT : 16
            }px)`,
          }}
        >
          {children}
        </main>

        {/* Where a floating BigButton lands: above the tab bar, under the thumb. */}
        <div
          ref={setNode}
          className={cx(
            'fixed inset-x-0 z-30 mx-auto max-w-lg px-4 pt-8 pb-3',
            hasAction
              ? 'bg-gradient-to-t from-paper via-paper to-transparent'
              : 'pointer-events-none',
          )}
          style={{ bottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom))` }}
        />

        <TabBar screen={screen} onSelect={onSelectTab} badges={badges} />
      </div>
    </ActionSlotContext.Provider>
  )
}

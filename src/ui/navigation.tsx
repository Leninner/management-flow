import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/** The four bottom tabs. There is nothing else at the top level. */
export type Screen = 'today' | 'orders' | 'customers' | 'more'

/** Detail views pushed on top of a tab. Each one has a back affordance. */
export type View =
  | { kind: 'capture' }
  | { kind: 'orderDetail'; orderId: string }
  | { kind: 'customerDetail'; customerId: string }
  | { kind: 'supplierOrder' }
  | { kind: 'gallery' }

export interface Navigation {
  /** The selected tab. Always one of the four, even while a view is open. */
  screen: Screen
  /** The view on top of the stack, if any. */
  view: View | undefined
  stack: readonly View[]
  canGoBack: boolean
  /** Switch tab. Drops any open detail view. */
  go: (screen: Screen) => void
  /** Open a detail view on top of the current tab. */
  push: (view: View) => void
  /** Close the top view. No-op at the root of a tab. */
  back: () => void
}

const NavigationContext = createContext<Navigation | null>(null)

export function useNavigation(): Navigation {
  const navigation = useContext(NavigationContext)
  if (!navigation) throw new Error('useNavigation needs <NavigationProvider>')
  return navigation
}

export function NavigationProvider({
  children,
  initialScreen = 'today',
}: {
  children: ReactNode
  initialScreen?: Screen
}) {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [stack, setStack] = useState<View[]>([])

  const go = useCallback((next: Screen) => {
    setScreen(next)
    setStack([])
  }, [])

  const push = useCallback((view: View) => {
    setStack((current) => [...current, view])
  }, [])

  const back = useCallback(() => {
    setStack((current) => current.slice(0, -1))
  }, [])

  useBrowserBackButton(stack.length, back)

  const value = useMemo<Navigation>(
    () => ({
      screen,
      view: stack[stack.length - 1],
      stack,
      canGoBack: stack.length > 0,
      go,
      push,
      back,
    }),
    [screen, stack, go, push, back],
  )

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

/**
 * Mirrors the view stack into browser history so the Android back gesture
 * closes the open view instead of closing the whole installed app. Nothing is
 * read back out of history: the React state stays the source of truth, and if
 * the two ever drift the worst case is one extra back press.
 */
function useBrowserBackButton(depth: number, onBack: () => void) {
  const historyDepth = useRef(0)
  const ignoreNextPop = useRef(0)

  useEffect(() => {
    if (depth > historyDepth.current) {
      for (let level = historyDepth.current; level < depth; level += 1) {
        window.history.pushState({ viewDepth: level + 1 }, '')
      }
      historyDepth.current = depth
    } else if (depth < historyDepth.current) {
      const steps = historyDepth.current - depth
      historyDepth.current = depth
      // A multi-step traversal still reports a single popstate.
      ignoreNextPop.current += 1
      window.history.go(-steps)
    }
  }, [depth])

  useEffect(() => {
    function handlePopState() {
      if (ignoreNextPop.current > 0) {
        ignoreNextPop.current -= 1
        return
      }
      historyDepth.current = Math.max(0, historyDepth.current - 1)
      onBack()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [onBack])
}

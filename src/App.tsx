import { useState, type ReactNode } from 'react'
import { NewOrder } from './screens/NewOrder'
import { Costs } from './screens/Costs'
import { CustomerDetail } from './screens/CustomerDetail'
import { More } from './screens/More'
import { Orders, type OrderFilter } from './screens/Orders'
import { OrderDetail } from './screens/OrderDetail'
import { SupplierOrder } from './screens/SupplierOrder'
import {
  AppShell,
  NavigationProvider,
  useNavigation,
  type Screen,
  type View,
} from './ui'

const VIEW_TITLE: Record<View['kind'], string> = {
  newOrder: 'Agregar pedido',
  orderDetail: 'Pedido',
  customerDetail: 'Cliente',
  costs: 'Oriflame',
}

function renderView(view: View): ReactNode {
  switch (view.kind) {
    case 'newOrder':
      return <NewOrder />
    case 'orderDetail':
      return <OrderDetail orderId={view.orderId} />
    case 'customerDetail':
      return <CustomerDetail customerId={view.customerId} />
    case 'costs':
      return <Costs />
  }
}

export function App() {
  return (
    <NavigationProvider>
      <Shell />
    </NavigationProvider>
  )
}

function Shell() {
  const { screen, view, go, back } = useNavigation()

  /**
   * The only state the shell owns. A row that says 5 and opens a list of 7 is
   * exactly what makes her hesitate, so whoever sends her to Pedidos can say
   * which view she is arriving at.
   */
  const [ordersFilter, setOrdersFilter] = useState<OrderFilter | undefined>(undefined)

  function selectTab(next: Screen) {
    // Tapping the tab itself always gives the plain list, so the filter can
    // never be stale.
    setOrdersFilter(undefined)
    go(next)
  }

  return (
    <AppShell
      screen={screen}
      onSelectTab={selectTab}
      title={view ? VIEW_TITLE[view.kind] : undefined}
      onBack={view ? back : undefined}
      // A pushed view owns the bottom of the phone for its own action.
      tabBar={!view}
    >
      {/* Remounting per view keeps a detail screen from inheriting stale state. */}
      {view ? (
        <div key={viewKey(view)}>{renderView(view)}</div>
      ) : (
        <Tab screen={screen} ordersFilter={ordersFilter} />
      )}
    </AppShell>
  )
}

function Tab({
  screen,
  ordersFilter,
}: {
  screen: Screen
  ordersFilter: OrderFilter | undefined
}): ReactNode {
  switch (screen) {
    case 'orders':
      return <Orders initialFilter={ordersFilter} />
    case 'oriflame':
      return <SupplierOrder />
    case 'more':
      return <More />
  }
}

function viewKey(view: View): string {
  switch (view.kind) {
    case 'orderDetail':
      return `orderDetail:${view.orderId}`
    case 'customerDetail':
      return `customerDetail:${view.customerId}`
    default:
      return view.kind
  }
}

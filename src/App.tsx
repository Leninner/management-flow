import { useState, type ReactNode } from 'react'
import { Capture } from './screens/Capture'
import { CustomerDetail } from './screens/CustomerDetail'
import { Customers } from './screens/Customers'
import { More } from './screens/More'
import { Orders, type OrderFilter } from './screens/Orders'
import { OrderDetail } from './screens/OrderDetail'
import { SupplierOrder } from './screens/SupplierOrder'
import { Today, type OrdersShortcut } from './screens/Today'
import {
  AppShell,
  Gallery,
  NavigationProvider,
  useNavigation,
  type Screen,
  type View,
} from './ui'

const VIEW_TITLE: Record<View['kind'], string> = {
  capture: 'Capturar',
  orderDetail: 'Pedido',
  customerDetail: 'Cliente',
  supplierOrder: 'Pedido a Oriflame',
  gallery: 'Diseño',
}

function renderView(view: View): ReactNode {
  switch (view.kind) {
    case 'capture':
      return <Capture />
    case 'orderDetail':
      return <OrderDetail orderId={view.orderId} />
    case 'customerDetail':
      return <CustomerDetail customerId={view.customerId} />
    case 'supplierOrder':
      return <SupplierOrder />
    case 'gallery':
      return <Gallery />
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
   * The only state the shell owns. Today's "Por cobrar" and "Por entregar"
   * rows open Pedidos already filtered, and a row saying 5 that opens a list
   * of 7 is exactly what makes her hesitate.
   */
  const [ordersFilter, setOrdersFilter] = useState<OrderFilter | undefined>(undefined)

  function selectTab(next: Screen) {
    // Tapping the tab itself always gives the plain list. Only the Hoy
    // shortcuts preselect, so the filter can never be stale.
    setOrdersFilter(undefined)
    go(next)
  }

  function openOrdersFiltered(filter: OrdersShortcut) {
    setOrdersFilter(filter)
    go('orders')
  }

  return (
    <AppShell
      screen={screen}
      onSelectTab={selectTab}
      title={view ? VIEW_TITLE[view.kind] : undefined}
      onBack={view ? back : undefined}
    >
      {/* Remounting per view keeps a detail screen from inheriting stale state. */}
      {view ? (
        <div key={viewKey(view)}>{renderView(view)}</div>
      ) : (
        <Tab screen={screen} ordersFilter={ordersFilter} onOpenOrders={openOrdersFiltered} />
      )}
    </AppShell>
  )
}

interface TabProps {
  screen: Screen
  ordersFilter: OrderFilter | undefined
  onOpenOrders: (filter: OrdersShortcut) => void
}

function Tab({ screen, ordersFilter, onOpenOrders }: TabProps): ReactNode {
  switch (screen) {
    case 'today':
      return <Today onOpenOrders={onOpenOrders} />
    case 'orders':
      return <Orders initialFilter={ordersFilter} />
    case 'customers':
      return <Customers />
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

/**
 * Domain types.
 *
 * Dates are stored as ISO strings, never Date objects: the JSON backup is the
 * only protection against the browser evicting IndexedDB, and Date does not
 * survive a JSON round-trip.
 */

export interface Campaign {
  id: string
  /** Catalog name, e.g. "C13-2026". */
  name: string
  /** Last day to place the consolidated order with Oriflame. ISO date. */
  cutoffDate: string
  /** Set when the merchandise arrives from Oriflame. ISO date. */
  arrivedAt?: string
  /**
   * What Oriflame invoiced for this campaign, which is what she paid with her
   * credit card. Absent means the invoice has not arrived, never that it is
   * zero: profit and card recovery both stay silent until it does.
   */
  supplierInvoiceAmount?: number
  active: boolean
}

export interface Customer {
  id: string
  name: string
  /** Other handles for the same person: TikTok user, phone, nickname. */
  aliases: string[]
  whatsapp?: string
  address?: string
  /**
   * One ISO date per follow-up sent to the person rather than to an order.
   * Without this the reengage trigger has nowhere to record "ya le escribí"
   * and repeats the same names every day until she stops opening the app.
   */
  contacts: string[]
}

export interface OrderItem {
  /** Free text, usually "<oriflame code> <product name>". */
  name: string
  quantity: number
  /** Snapshot of the price at sale time. Never a reference. */
  price: number
}

export interface Order {
  id: string
  campaignId: string
  customerId: string
  items: OrderItem[]
  /** 0 means nothing paid yet. */
  paidAmount: number
  /** 0 means hand delivery in Ambato. */
  shippingCost: number
  /** False while the order is only a claim shouted during the live. */
  confirmed: boolean
  /** Absent means not delivered yet. ISO date. */
  deliveredAt?: string
  /** One ISO date per follow-up message sent. Length is the follow-up count. */
  contacts: string[]
  createdAt: string
  notes?: string
}

/** Key-value store for message templates, bank details and app preferences. */
export interface Setting {
  key: string
  value: string
}

export interface BackupFile {
  version: 1
  exportedAt: string
  campaigns: Campaign[]
  customers: Customer[]
  orders: Order[]
  settings: Setting[]
}

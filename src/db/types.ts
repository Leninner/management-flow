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
   *
   * It survives alongside the per-line costs because it is the number the card
   * actually charged, shipping and taxes included. When both exist and they
   * disagree, the difference is shown as other charges and never spread across
   * the lines.
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
  /**
   * Oriflame product code, "38588". Absent on lines written before codes were
   * split out of the name, and on the occasional thing sold without one.
   * Having it is what lets the app paste into Oriflame's quick order, group
   * without guessing at spelling, and open the public product page.
   */
  code?: string
  name: string
  quantity: number
  /**
   * Snapshot of the price this person was quoted. Never a reference, so a new
   * campaign cannot rewrite what somebody already owes, and a discount given to
   * one customer cannot move another customer's price.
   *
   * Absent means the price is not known yet, never zero. A zero is a price and
   * it lies in every sum it touches; an absent price is counted and reported.
   */
  price?: number
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
  /** Absent means not delivered yet. ISO date. */
  deliveredAt?: string
  /** One ISO date per follow-up message sent. Length is the follow-up count. */
  contacts: string[]
  createdAt: string
  notes?: string
}

/**
 * A product as it exists inside one campaign.
 *
 * Prices change between catalogues, so the campaign owns the price and not the
 * product. Deriving it from the last item sold would mean that discounting a
 * line for María moves the price Ana sees, and the cost would have nowhere to
 * live at all.
 */
export interface CampaignProduct {
  /** `${campaignId}:${code}`. */
  id: string
  campaignId: string
  /** Oriflame product code, "38588". */
  code: string
  name: string
  /** Catalogue price for this campaign. Absent until she fills it in. */
  price?: number
}

/*
 * There is deliberately no cost per product. She does not know what a product
 * costs her until she is paying at Oriflame, and asking her to type twenty of
 * them is asking her not to. What the card was charged for the whole pedido
 * lives on the campaign as `supplierInvoiceAmount`, and the margin is one
 * subtraction from it.
 */

/** Key-value store for message templates, bank details and app preferences. */
export interface Setting {
  key: string
  value: string
}

export interface BackupFile {
  version: 2
  exportedAt: string
  campaigns: Campaign[]
  customers: Customer[]
  orders: Order[]
  campaignProducts: CampaignProduct[]
  settings: Setting[]
}

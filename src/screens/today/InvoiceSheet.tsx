import { useEffect, useState } from 'react'
import { campaigns } from '../../data'
import type { Campaign } from '../../db/types'
import { BigButton, MoneyField, parseAmount, Sheet } from '../../ui'

export interface InvoiceSheetProps {
  open: boolean
  onClose: () => void
  campaign: Campaign
}

/**
 * The one number the whole money side of the app hangs off: what Oriflame
 * invoiced for this campaign, which is what her card was charged. It gets its
 * own sheet, reachable from the tile that is waiting for it, because asking
 * her to go find it under Más is asking her not to write it down.
 */
export function InvoiceSheet({ open, onClose, campaign }: InvoiceSheetProps) {
  const [amount, setAmount] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!open) return
    setAmount(
      campaign.supplierInvoiceAmount === undefined ? '' : String(campaign.supplierInvoiceAmount),
    )
    setWorking(false)
  }, [open, campaign.supplierInvoiceAmount])

  async function save() {
    if (working) return
    setWorking(true)
    try {
      await campaigns.setSupplierInvoice(campaign.id, parseAmount(amount))
      onClose()
    } finally {
      setWorking(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Factura ${campaign.name}`}
      footer={
        <BigButton floating={false} disabled={working} onClick={save}>
          Guardar
        </BigButton>
      }
    >
      <MoneyField
        label="Lo que me facturó Oriflame"
        value={amount}
        onChange={setAmount}
        autoFocus
        onSubmit={save}
      />
    </Sheet>
  )
}

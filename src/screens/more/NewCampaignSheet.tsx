/**
 * Opening the next catalog. The only decision it asks for is what happens to
 * the orders nobody confirmed: they follow the customer, or they go. Anything
 * she confirmed stays where it is.
 */
import { useEffect, useState } from 'react'
import { campaigns, orders } from '../../data'
import { BigButton, SectionHeader, Sheet } from '../../ui'
import { discardUnconfirmedOrders } from './campaignSwitch'
import { ErrorNote, TextField } from './fields'
import { todayInput } from './format'

type Choice = 'carry' | 'discard'

export interface NewCampaignSheetProps {
  open: boolean
  onClose: () => void
  /** The campaign that is closing, if there is one. */
  currentCampaignId?: string
  unconfirmedCount: number
}

export function NewCampaignSheet({
  open,
  onClose,
  currentCampaignId,
  unconfirmedCount,
}: NewCampaignSheetProps) {
  const [name, setName] = useState('')
  const [cutoff, setCutoff] = useState(todayInput)
  // Carrying is the default: deleting orders by accident is the worse mistake.
  const [choice, setChoice] = useState<Choice>('carry')
  const [working, setWorking] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setCutoff(todayInput())
    setChoice('carry')
    setWorking(false)
    setFailed(false)
  }, [open])

  const ready = name.trim() !== '' && cutoff !== '' && !working

  async function openCampaign() {
    if (!ready) return
    setWorking(true)
    setFailed(false)
    try {
      const created = await campaigns.create({ name: name.trim(), cutoffDate: cutoff })
      if (currentCampaignId && unconfirmedCount > 0) {
        if (choice === 'carry') await orders.moveUnconfirmed(currentCampaignId, created.id)
        else await discardUnconfirmedOrders(currentCampaignId)
      }
      onClose()
    } catch {
      // The repository rejects a name or a cutoff it cannot store. She has to
      // see that, or she walks away believing the campaign is open.
      setFailed(true)
    } finally {
      setWorking(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nueva campaña"
      footer={
        <BigButton floating={false} disabled={!ready} onClick={openCampaign}>
          Abrirla
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField value={name} onChange={setName} label="Catálogo" placeholder="C14-2026" />
        <TextField value={cutoff} onChange={setCutoff} label="Corte" type="date" />
        {failed && <ErrorNote>Revisa el nombre y la fecha</ErrorNote>}

        {currentCampaignId && unconfirmedCount > 0 && (
          <>
            <SectionHeader title="Sin confirmar" count={unconfirmedCount} />
            <div className="flex flex-col gap-2">
              <BigButton
                floating={false}
                variant={choice === 'carry' ? 'primary' : 'quiet'}
                onClick={() => setChoice('carry')}
              >
                Pasarlos a la nueva
              </BigButton>
              <BigButton
                floating={false}
                variant={choice === 'discard' ? 'danger' : 'quiet'}
                onClick={() => setChoice('discard')}
              >
                Borrarlos
              </BigButton>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

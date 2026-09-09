/**
 * Opening the next catalog. The only decision it asks for is what happens to
 * the orders nobody confirmed: they follow the customer, or they go. Anything
 * she confirmed stays where it is.
 */
import { useEffect, useState } from 'react'
import { campaigns, orders } from '../../data'
import { BigButton, SectionHeader, Sheet, TextField } from '../../ui'
import { discardOpenOrders } from './campaignSwitch'
import { ErrorNote } from './fields'
import { todayInput } from './format'

type Choice = 'carry' | 'discard'

export interface NewCampaignSheetProps {
  open: boolean
  onClose: () => void
  /** The campaign that is closing, if there is one. */
  currentCampaignId?: string
  openCount: number
}

export function NewCampaignSheet({
  open,
  onClose,
  currentCampaignId,
  openCount,
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
      if (currentCampaignId && openCount > 0) {
        if (choice === 'carry') await orders.moveOpenOrders(currentCampaignId, created.id)
        else await discardOpenOrders(currentCampaignId)
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

        {currentCampaignId && openCount > 0 && (
          <>
            <SectionHeader title="Sin empezar" count={openCount} />
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

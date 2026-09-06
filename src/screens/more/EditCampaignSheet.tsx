/**
 * Fixing the open campaign. A typo in the catalog name or a cutoff typed a day
 * off used to mean opening a whole new campaign, which would strand every order
 * already captured against this one.
 */
import { useEffect, useState } from 'react'
import { campaigns } from '../../data'
import type { Campaign } from '../../db/types'
import { BigButton, Sheet } from '../../ui'
import { ErrorNote, TextField } from './fields'
import { toDateInput } from './format'

export interface EditCampaignSheetProps {
  open: boolean
  onClose: () => void
  campaign: Campaign | undefined
}

export function EditCampaignSheet({ open, onClose, campaign }: EditCampaignSheetProps) {
  const [name, setName] = useState('')
  const [cutoff, setCutoff] = useState('')
  const [working, setWorking] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open || !campaign) return
    setName(campaign.name)
    setCutoff(toDateInput(campaign.cutoffDate))
    setWorking(false)
    setFailed(false)
  }, [open, campaign])

  if (!campaign) return null

  const changed = name !== campaign.name || cutoff !== toDateInput(campaign.cutoffDate)
  const ready = name.trim() !== '' && cutoff !== '' && changed && !working

  async function save() {
    if (!ready || !campaign) return
    setWorking(true)
    setFailed(false)
    try {
      await campaigns.update(campaign.id, { name: name.trim(), cutoffDate: cutoff })
      onClose()
    } catch {
      // A cutoff the repository refuses would leave every day count in the
      // follow-up rules reading as NaN, so a rejection has to be visible.
      setFailed(true)
    } finally {
      setWorking(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Campaña"
      footer={
        <BigButton floating={false} disabled={!ready} onClick={save}>
          Guardar
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField value={name} onChange={setName} label="Catálogo" placeholder="C13-2026" />
        <TextField value={cutoff} onChange={setCutoff} label="Corte" type="date" />
        {failed && <ErrorNote>Revisa el nombre y la fecha</ErrorNote>}
      </div>
    </Sheet>
  )
}

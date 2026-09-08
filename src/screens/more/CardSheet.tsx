import { useEffect, useState } from 'react'
import { settings } from '../../data'
import { BigButton, dayOfMonthOptions, Select, Sheet } from '../../ui'
import { CARD_CUTOFF_DAY_KEY, CARD_DUE_DAY_KEY, type CardSettings } from './card'

export interface CardSheetProps {
  open: boolean
  onClose: () => void
  card: CardSettings
}

/**
 * Two days of the month, set once. Nothing else about the card is stored: the
 * app never sees a number, a balance or a bank, only when the money is due.
 */
export function CardSheet({ open, onClose, card }: CardSheetProps) {
  const [cutoff, setCutoff] = useState('')
  const [due, setDue] = useState('')

  useEffect(() => {
    if (!open) return
    setCutoff(card.cutoffDay === undefined ? '' : String(card.cutoffDay))
    setDue(card.dueDay === undefined ? '' : String(card.dueDay))
  }, [open, card.cutoffDay, card.dueDay])

  const options = dayOfMonthOptions()

  async function save() {
    await writeDay(CARD_CUTOFF_DAY_KEY, cutoff)
    await writeDay(CARD_DUE_DAY_KEY, due)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Mi tarjeta"
      footer={
        <BigButton floating={false} disabled={cutoff === ''} onClick={save}>
          Guardar
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">
        <Select
          label="Corta el día"
          value={cutoff}
          onChange={setCutoff}
          options={options}
          placeholder="Elige un día"
        />
        <Select
          label="Se paga el día"
          value={due}
          onChange={setDue}
          options={options}
          placeholder="Elige un día"
        />
      </div>
    </Sheet>
  )
}

/** An empty pick clears the setting instead of storing an empty string. */
async function writeDay(key: string, value: string): Promise<void> {
  if (value === '') await settings.remove(key)
  else await settings.set(key, value)
}

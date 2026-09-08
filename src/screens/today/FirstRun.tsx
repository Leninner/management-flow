import { useState } from 'react'
import { campaigns } from '../../data'
import { BigButton, Card, TextField } from '../../ui'

/**
 * Everything the app needs to exist: a name and a cutoff. Two fields and she
 * is capturing. Anything more asked here and she does not open the app again.
 */
export function FirstRun() {
  const [name, setName] = useState('')
  const [cutoffDate, setCutoffDate] = useState('')
  const [saving, setSaving] = useState(false)

  const ready = name.trim() !== '' && cutoffDate !== ''

  async function start() {
    if (!ready || saving) return
    setSaving(true)
    try {
      await campaigns.create({ name: name.trim(), cutoffDate })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h2 className="px-1 pt-8 pb-4 text-[1.75rem] leading-tight font-bold text-balance">
        Empecemos la campaña
      </h2>

      <Card className="flex flex-col gap-5">
        <TextField
          label="¿Cómo se llama la campaña?"
          value={name}
          onChange={setName}
          placeholder="C13-2026"
          autoFocus
        />
        <TextField
          label="¿Cuándo es el corte?"
          value={cutoffDate}
          onChange={setCutoffDate}
          type="date"
        />
      </Card>

      <BigButton onClick={start} disabled={!ready || saving}>
        Empezar
      </BigButton>
    </>
  )
}

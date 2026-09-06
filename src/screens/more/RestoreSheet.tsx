/**
 * Restoring a backup replaces everything and never merges, so the file has to
 * be read and counted before she is asked to commit to it.
 */
import { FileJson, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { backup } from '../../data'
import type { BackupFile } from '../../db/types'
import { BigButton, Card, Row, Sheet } from '../../ui'
import { readJsonFile } from './backupFile'
import { formatDay } from './format'

export interface RestoreSheetProps {
  open: boolean
  onClose: () => void
  onRestored: () => void
}

export function RestoreSheet({ open, onClose, onRestored }: RestoreSheetProps) {
  const picker = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<BackupFile | null>(null)
  const [failed, setFailed] = useState(false)
  const [working, setWorking] = useState(false)

  function reset() {
    setFile(null)
    setFailed(false)
    setWorking(false)
    if (picker.current) picker.current.value = ''
  }

  function close() {
    reset()
    onClose()
  }

  async function pick(chosen: File | undefined) {
    if (!chosen) return
    setFailed(false)
    try {
      setFile(backup.parseBackup(await readJsonFile(chosen)))
    } catch {
      setFile(null)
      setFailed(true)
    }
  }

  async function restore() {
    if (!file) return
    setWorking(true)
    try {
      await backup.importBackup(file)
      reset()
      onRestored()
    } catch {
      setWorking(false)
      setFailed(true)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Restaurar"
      footer={
        file ? (
          <BigButton floating={false} variant="danger" disabled={working} onClick={restore}>
            Sí, reemplazar todo
          </BigButton>
        ) : (
          <BigButton
            floating={false}
            variant="quiet"
            icon={Upload}
            onClick={() => picker.current?.click()}
          >
            Buscar el archivo
          </BigButton>
        )
      }
    >
      <input
        ref={picker}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void pick(event.target.files?.[0])}
      />

      <div className="flex flex-col gap-3">
        {file ? (
          <>
            <Row
              icon={FileJson}
              title={`Respaldo del ${formatDay(file.exportedAt)}`}
              subtitle={`${file.orders.length} pedidos · ${file.customers.length} clientes`}
            />
            <Card className="bg-owes-soft">
              <p className="text-xl leading-tight font-bold text-ink">
                Esto borra todo lo que tienes ahora.
              </p>
            </Card>
          </>
        ) : (
          <Card className={failed ? 'bg-owes-soft' : undefined}>
            <p className="text-xl leading-tight font-semibold">
              {failed ? 'Ese archivo no sirve' : 'Elige un respaldo guardado'}
            </p>
          </Card>
        )}
      </div>
    </Sheet>
  )
}

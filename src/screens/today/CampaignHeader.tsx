import { CalendarDays } from 'lucide-react'
import type { Campaign } from '../../db/types'
import { daysBetween } from '../../domain'
import { Card, cx } from '../../ui'
import { formatDayMonth } from './format'

/** Three days out the deadline stops being information and becomes an alarm. */
const URGENT_DAYS = 3

interface Alarm {
  /** The big thing. A number of days, or the word for today. */
  headline: string
  /** The small thing next to it. */
  tail: string
  urgent: boolean
}

function alarm(days: number): Alarm {
  if (days < 0) {
    const since = -days
    return {
      headline: String(since),
      tail: since === 1 ? 'día desde que cerró' : 'días desde que cerró',
      urgent: false,
    }
  }
  if (days === 0) return { headline: 'Hoy', tail: 'cierra el catálogo', urgent: true }
  return {
    headline: String(days),
    tail: days === 1 ? 'día para cerrar' : 'días para cerrar',
    urgent: true,
  }
}

/**
 * The campaign deadline, sized to how much it matters right now.
 *
 * Most of the three weeks it is one quiet line, because a number that large
 * for something a month away buries the money underneath it. It only grows
 * into an alarm once it is close enough to change what she does today.
 *
 * The catalogue "cierra"; the card "corta". Two different clocks that never
 * line up, so they never get the same verb.
 */
export function CampaignHeader({ campaign, today }: { campaign: Campaign; today: string }) {
  const days = daysBetween(today, campaign.cutoffDate)

  if (days > URGENT_DAYS) {
    return (
      <p className="flex items-center gap-2 px-1 pt-3 pb-1 text-[0.9375rem] font-medium text-muted">
        <CalendarDays size={17} aria-hidden="true" />
        <span className="truncate">
          {campaign.name} · cierra el {formatDayMonth(campaign.cutoffDate)}
        </span>
      </p>
    )
  }

  const { headline, tail, urgent } = alarm(days)

  return (
    <Card
      className={cx('mt-3', urgent ? 'border-owes bg-owes-soft' : 'border-pending bg-pending-soft')}
    >
      <p
        className={cx(
          'flex items-center gap-2 text-[0.9375rem] font-semibold',
          urgent ? 'text-owes-ink' : 'text-pending-ink',
        )}
      >
        <CalendarDays size={18} aria-hidden="true" />
        <span className="truncate">Campaña {campaign.name}</span>
      </p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <span
          className={cx(
            'money text-[3rem] font-bold tracking-tight tabular-nums',
            urgent ? 'text-owes' : 'text-ink',
          )}
        >
          {headline}
        </span>
        <span className="text-xl leading-tight font-semibold text-balance">{tail}</span>
      </p>
    </Card>
  )
}

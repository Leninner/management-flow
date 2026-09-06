import { CalendarDays } from 'lucide-react'
import type { Campaign } from '../../db/types'
import { daysBetween } from '../../domain'
import { Card, cx } from '../../ui'

/** Three days out the deadline stops being information and becomes an alarm. */
const URGENT_DAYS = 3

interface Countdown {
  /** The big thing. A number of days, or the word for today. */
  headline: string
  /** The small thing next to it. */
  tail: string
  tone: 'calm' | 'urgent' | 'past'
}

function countdown(days: number): Countdown {
  if (days < 0) {
    const since = -days
    return { headline: String(since), tail: since === 1 ? 'día desde el corte' : 'días desde el corte', tone: 'past' }
  }
  if (days === 0) return { headline: 'Hoy', tail: 'es el corte', tone: 'urgent' }
  return {
    headline: String(days),
    tail: days === 1 ? 'día para el corte' : 'días para el corte',
    tone: days <= URGENT_DAYS ? 'urgent' : 'calm',
  }
}

const SHELL: Record<Countdown['tone'], string> = {
  calm: '',
  urgent: 'border-owes bg-owes-soft',
  past: 'border-pending bg-pending-soft',
}

const HEADLINE: Record<Countdown['tone'], string> = {
  calm: 'text-ink text-[2.5rem]',
  urgent: 'text-owes text-[3.25rem]',
  past: 'text-ink text-[2.5rem]',
}

/**
 * The first thing she sees. The campaign is the heartbeat of the business and
 * the cutoff is the only real deadline in it, so the number of days left is
 * the largest thing on the screen the moment it starts to matter.
 */
export function CampaignHeader({ campaign, today }: { campaign: Campaign; today: string }) {
  const { headline, tail, tone } = countdown(daysBetween(today, campaign.cutoffDate))

  return (
    <Card className={cx('mt-2', SHELL[tone])}>
      <p className="flex items-center gap-2 text-[0.9375rem] font-bold tracking-widest text-muted uppercase">
        <CalendarDays size={18} aria-hidden="true" />
        <span className="truncate">Campaña {campaign.name}</span>
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className={cx('money font-bold tracking-tight tabular-nums', HEADLINE[tone])}>
          {headline}
        </span>
        <span className="text-xl leading-tight font-semibold text-balance">{tail}</span>
      </p>
    </Card>
  )
}

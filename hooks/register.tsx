import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CacheInfo, Limit } from '../types'

/** TTL della prompt cache di questa installazione (1 h). */
const TTL_MS = 60 * 60 * 1000
/** Quanto prima della scadenza lanciare l'handoff. */
const LEAD_MS = 5 * 60 * 1000
/** Ogni quanto ricontrollare e ridisegnare la barra. */
const TICK_MS = 15 * 1000
/** Stile di claude-counter: barra sottile blu su traccia grigia, rosso oltre il 90%, segno sottile. */
const FILL = '#2c84db'
const WARN = '#ce2029'
const TRACK = 'subtle'
const MARK = 'text'
const MINI_CELLS = 10
const USAGE_CELLS = 12

const WINDOW_MS: Record<string, number> = {
  five_hour: 5 * 60 * 60 * 1000,
  seven_day: 7 * 24 * 60 * 60 * 1000,
}
const LIMIT_LABEL: Record<string, string> = { five_hour: '5h', seven_day: '7g' }

const EMPTY: CacheInfo = {
  lastActivityMs: null,
  tokens: null,
  percent: null,
  handoffDone: false,
  expiredWarned: false,
}

const info = atom({ plugin: 'cache-timer', key: 'info' } as const, EMPTY)
const now = atom({ plugin: 'cache-timer', key: 'now' } as const, 0)

const HANDOFF_PROMPT =
  'La prompt cache di questa sessione scade tra pochi minuti. ' +
  'Esegui ora la skill `handoff` (tool Skill, skill "handoff") per salvare lo stato del lavoro, ' +
  'così la prossima sessione può ripartire da lì. Non iniziare altro lavoro.'

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** Barra sottile: `full` celle piene (━), poi traccia (─); segno opzionale (│) nella cella `marker`. */
const cells = (n: number, fill: number, marker?: number) => {
  const full = Math.round(clamp01(fill) * n)
  const at = marker === undefined ? -1 : Math.min(n - 1, Math.round(clamp01(marker) * (n - 1)))
  const seg = (from: number, to: number) => ({
    fill: '━'.repeat(Math.max(0, Math.min(to, full) - from)),
    track: '━'.repeat(Math.max(0, to - Math.max(from, full))),
  })
  if (at < 0) return { a: seg(0, n), mark: '', b: seg(n, n) }
  return { a: seg(0, at), mark: '┃', b: seg(at + 1, n) }
}

let handoffPending = false

async function tick($: EngineInterface) {
  const t = await $.clock.now()
  await update($, now, () => t)
  const cur = await read($, info)
  if (cur.lastActivityMs === null || cur.handoffDone || handoffPending || cur.isAnswering) return
  const left = cur.lastActivityMs + TTL_MS - t
  if (left > 0 && left <= LEAD_MS) {
    handoffPending = true
    $.ui.toast('Cache in scadenza: lancio l’handoff')
    void $.prompt.submit({ text: HANDOFF_PROMPT })
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await update($, now, () => 0)
    $.clock.every(TICK_MS, () => void tick($))
    return r
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'plugin') return next(e)
    const cur = await read($, info)
    const t = await $.clock.now()
    const expired = cur.lastActivityMs !== null && t - cur.lastActivityMs > TTL_MS
    if (expired && !cur.expiredWarned) {
      await update($, info, v => ({ ...v, expiredWarned: true }))
      return {
        drop:
          'La cache di questa sessione è scaduta: continuare qui rimanda tutto il contesto a prezzo pieno. ' +
          (cur.handoffDone
            ? 'L’handoff è stato salvato: apri una nuova sessione e scrivi «riprendi dall’ultimo handoff». '
            : 'Nessun handoff automatico salvato: in una nuova sessione chiedi di riprendere dallo stato del progetto.') +
          'Se vuoi comunque continuare qui, reinvia il messaggio.',
      }
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) await update($, info, v => ({ ...v, isAnswering: true }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined) return r
    const t = await $.clock.now()
    const usage = await $.session.usage()
    const limits: Limit[] = usage.rateLimits
      .filter(l => l.kind in WINDOW_MS)
      .map(l => ({
        kind: l.kind,
        percentUsed: l.percentUsed,
        resetsAtMs: l.resetsAt ? Date.parse(l.resetsAt) : null,
      }))
    const wasHandoff = handoffPending
    handoffPending = false
    await update($, info, v => ({
      lastActivityMs: t,
      tokens: usage.context.tokens ?? v.tokens,
      percent: usage.context.percent ?? v.percent,
      // l'handoff vale fino al prossimo turno dell'utente
      handoffDone: wasHandoff,
      expiredWarned: false,
      limits: limits.length > 0 ? limits : v.limits,
      isAnswering: false,
    }))
    await update($, now, () => t)
    return r
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const cur = await read($, info)
    const t = (await read($, now)) || cur.lastActivityMs || 0
    if (e.props.hasSurvey || cur.lastActivityMs === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)

    /** Un gruppo: etichetta piccola e barra. */
    const group = (
      key: string,
      label: string,
      fill: number,
      color: string,
      opts: { marker?: number; isDim?: boolean; n?: number } = {},
    ) => {
      const c = cells(opts.n ?? MINI_CELLS, fill, opts.marker)
      const part = (s: { fill: string; track: string }, k: string) => [
        s.fill !== '' && (
          <Text key={`${k}f`} mono color={color} dimColor={opts.isDim}>
            {s.fill}
          </Text>
        ),
        s.track !== '' && (
          <Text key={`${k}t`} mono color={TRACK}>
            {s.track}
          </Text>
        ),
      ]
      return (
        <Box key={key} gap={1} alignItems="center">
          <Text dimColor size="caption">{label}</Text>
          <Box>
            {part(c.a, 'a')}
            {c.mark !== '' && (
              <Text mono color={MARK}>
                {c.mark}
              </Text>
            )}
            {part(c.b, 'b')}
          </Box>
        </Box>
      )
    }

    const left = cur.lastActivityMs + TTL_MS - t
    const ctx = clamp01((cur.percent ?? 0) / 100)
    const ctxColor = ctx >= 0.9 ? WARN : FILL
    const timeColor = left <= LEAD_MS ? WARN : FILL
    const isAnswering = cur.isAnswering === true

    const limitGroups = (cur.limits ?? []).map(l => {
      const win = WINDOW_MS[l.kind]
      const toReset = l.resetsAtMs !== null ? l.resetsAtMs - t : null
      const marker = toReset !== null && win ? clamp01(1 - toReset / win) : undefined
      const color = l.percentUsed >= 90 ? WARN : FILL
      return group(`lim-${l.kind}`, LIMIT_LABEL[l.kind] ?? l.kind, l.percentUsed / 100, color, {
        marker,
        n: USAGE_CELLS,
      })
    })

    return (
      <Box width="100%" justifyContent="space-between" alignItems="center" flexWrap="nowrap" paddingX={1}>
        <Box gap={3} alignItems="center">
          <Box gap={1} alignItems="center">
            <Text color={timeColor} dimColor={isAnswering}>●</Text>
            {group('cache', 'cache', 1 - left / TTL_MS, timeColor, { isDim: isAnswering })}
          </Box>
          {group('ctx', 'contesto', ctx, ctxColor)}
        </Box>
        {limitGroups.length > 0 && (
          <Box gap={3} alignItems="center">
            {limitGroups}
          </Box>
        )}
      </Box>
    )
  })
}

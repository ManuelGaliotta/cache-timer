export type Limit = {
  /** `five_hour`, `seven_day` o altro. */
  kind: string
  /** 0..100 */
  percentUsed: number
  /** ms epoch del reset; null se non noto. */
  resetsAtMs: number | null
}

export type CacheInfo = {
  /** Ultima risposta del modello nel thread principale (ms epoch); null prima della prima. */
  lastActivityMs: number | null
  /** Token che la prossima richiesta rimanda (quelli in cache). */
  tokens: number | null
  /** Percentuale del contesto usata. */
  percent: number | null
  /** Handoff automatico già fatto per questa finestra di cache. */
  handoffDone: boolean
  /** Avviso di cache scaduta già mostrato una volta. */
  expiredWarned: boolean
  /** Limiti d'uso (5 h, settimana) dell'ultima risposta. */
  limits?: Limit[]
  /** Claude sta rispondendo: la cache si sta rinnovando. */
  isAnswering?: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'cache-timer': { info: CacheInfo; now: number }
  }
}

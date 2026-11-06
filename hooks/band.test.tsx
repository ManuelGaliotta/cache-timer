import { expect, test } from 'claude-code/testing'

const T0 = Date.parse('2026-11-06T10:00:00Z')

const INFO = {
  lastActivityMs: T0,
  tokens: 134000,
  percent: 13,
  handoffDone: false,
  expiredWarned: false,
  limits: [
    { kind: 'five_hour', percentUsed: 40, resetsAtMs: T0 + 2 * 3600 * 1000 },
    { kind: 'seven_day', percentUsed: 92, resetsAtMs: T0 + 3 * 86400 * 1000 },
  ],
  isAnswering: false,
}

test('la banda disegna le quattro barre, su ogni superficie', async ($, on) => {
  on('state.get', (_, e) => {
    const key = (e as { key?: string }).key
    if (key === 'info') return { value: { value: INFO, version: 1 } }
    if (key === 'now') return { value: { value: T0 + 20 * 60 * 1000, version: 1 } }
    return { value: undefined }
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'cache-timer',
      component: 'AbovePrompt',
      surface,
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 },
    } as never)
    for (const label of ['contesto', 'cache', '5h', '7g']) {
      expect((await ui.find({ type: 'Text', text: label }))?.text).toBe(label)
    }
    expect(await ui.find({ type: 'Text', text: /scade tra|reset tra/ })).toBeUndefined()
    await ui.unmount()
  }
})

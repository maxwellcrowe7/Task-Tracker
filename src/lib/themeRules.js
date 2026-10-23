// Appearance choices, stored per device:
//   light / dark: always that
//   auto: dark between darkFrom and darkUntil (can run overnight), light otherwise
export const THEME_DEFAULTS = { mode: 'auto', darkFrom: '19:00', darkUntil: '07:00' }

const minutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

export function resolveTheme(settings, now) {
  const { mode, darkFrom, darkUntil } = { ...THEME_DEFAULTS, ...settings }
  if (mode === 'light' || mode === 'dark') return mode
  const t = now.getHours() * 60 + now.getMinutes()
  const from = minutes(darkFrom)
  const until = minutes(darkUntil)
  if (from === until) return 'light'
  const dark = from < until ? t >= from && t < until : t >= from || t < until
  return dark ? 'dark' : 'light'
}

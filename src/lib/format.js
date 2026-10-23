// "Mon, 19 Oct" style dates for display, in the user's locale.
export function formatDate(date, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, options)
}

export const formatShortDate = (date) => formatDate(date, { day: 'numeric', month: 'short' })

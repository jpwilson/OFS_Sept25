// A small drawn SVG icon set (owner: F0). 24-unit grid, 2px strokes in currentColor.
const PATHS = {
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  'arrow-down': <path d="M12 4v15M6 13l6 6 6-6" />,
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  pin: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.8" r="2.4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c.6-3.3 2.8-5.2 5.5-5.2s4.9 1.9 5.5 5.2" />
      <circle cx="16.5" cy="9.5" r="2.4" />
      <path d="M15.5 14.6c2.6-.3 4.5 1.4 5 4.4" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
}

export const ICON_NAMES = Object.keys(PATHS)

/**
 * <Icon name="pin" size={20} title="Location" />. Decorative (aria-hidden) unless a title is given.
 */
export function Icon({ name, size = 20, title, className, style }) {
  const body = PATHS[name]
  if (!body) return null
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {body}
    </svg>
  )
}

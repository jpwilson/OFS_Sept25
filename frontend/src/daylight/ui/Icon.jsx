// Drawn icons (owner: F0). 24-unit grid, 2px strokes in currentColor. Reuses the landing's
// Icon for the ten names it has (arrow arrow-down play pin lock people heart close check
// plus) and adds what an app needs. Packages may ask F0 for more; do not draw emoji.
import { Icon as LandingIcon, ICON_NAMES as LANDING_NAMES } from '../../landing/ui/Icon.jsx'

const PATHS = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  stories: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M4 14l4.5-4 4 3.5 2.5-2 5 4.5" />
      <circle cx="15.5" cy="8.5" r="1.5" />
    </>
  ),
  map: (
    <>
      <path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5M12 3.5C9.4 5.9 8.2 8.7 8.2 12s1.2 6.1 3.8 8.5" />
    </>
  ),
  family: (
    <>
      <circle cx="8" cy="7.5" r="2.7" />
      <circle cx="16" cy="7.5" r="2.7" />
      <circle cx="12" cy="14" r="2.2" />
      <path d="M3 19c.4-3 2.3-4.8 5-4.8M21 19c-.4-3-2.3-4.8-5-4.8M8.5 21c.4-2 1.7-3.2 3.5-3.2s3.1 1.2 3.5 3.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.7" />
      <path d="M4.5 20.5c.9-4 3.8-6.3 7.5-6.3s6.6 2.3 7.5 6.3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  'chevron-down': <path d="M6 9.5l6 6 6-6" />,
  'chevron-up': <path d="M6 14.5l6-6 6 6" />,
  'chevron-left': <path d="M14.5 6l-6 6 6 6" />,
  'chevron-right': <path d="M9.5 6l6 6-6 6" />,
  'arrow-left': <path d="M20 12H5M11 6l-6 6 6 6" />,
  minus: <path d="M5 12h14" />,
  edit: (
    <>
      <path d="M4.5 19.5l1-4.5L16 4.5a2.1 2.1 0 0 1 3 3L8.5 18z" />
      <path d="M14 6.5l3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />
      <path d="M5 13v6.5h14V13" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" />
    </>
  ),
  comment: <path d="M4.5 5.5h15v10.5h-8l-4.5 3.5V16h-2.5z" />,
  photo: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4" />
    </>
  ),
  photos: (
    <>
      <rect x="7" y="3.5" width="13.5" height="13.5" rx="2.5" />
      <path d="M17 20.5H5.5a2 2 0 0 1-2-2V7" />
      <path d="M7.5 14l3.5-3 2.5 2 2-1.5 4.5 3.5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3.5l1.5-2.5h6L16.5 8H20v11H4z" />
      <circle cx="12" cy="13" r="3.3" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </>
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  pen: (
    <>
      <path d="M5 19l1.2-4.2L15.5 5.5l3 3-9.3 9.3z" />
      <path d="M4 21h16" />
    </>
  ),
  stack: (
    <>
      <path d="M12 4l8.5 4.5L12 13 3.5 8.5z" />
      <path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5" />
    </>
  ),
  layers: (
    <>
      <path d="M12 4l8.5 4.5L12 13 3.5 8.5z" />
      <path d="M3.5 13L12 17.5l8.5-4.5" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  timeline: (
    <>
      <path d="M7 3.5v17" />
      <circle cx="7" cy="7.5" r="2" />
      <circle cx="7" cy="16.5" r="2" />
      <path d="M11 7.5h8.5M11 16.5h8.5" />
    </>
  ),
  feed: (
    <>
      <rect x="4" y="4" width="16" height="7" rx="2" />
      <rect x="4" y="14" width="7" height="6" rx="2" />
      <rect x="13" y="14" width="7" height="6" rx="2" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.2l-1.7 3.9-3.9 1.7 1.7-3.9z" />
    </>
  ),
  mountain: <path d="M2.5 19.5L9 8.5l3.5 5.5 2.5-3.5 6.5 9z" />,
  route: (
    <>
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8 17.5h6.5a3 3 0 0 0 0-6h-5a3 3 0 0 1 0-6H16" />
    </>
  ),
  home: <path d="M4 11l8-6.5 8 6.5v9h-5.5v-5.5h-5V20H4z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4.5H5.5v15H10" />
      <path d="M14.5 8l4 4-4 4M18.5 12H9.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.8" />
      <circle cx="12" cy="17.3" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  sparkle: <path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />,
  download: (
    <>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  swap: <path d="M7 4.5L3.5 8 7 11.5M3.5 8h13M17 12.5l3.5 3.5-3.5 3.5M20.5 16h-13" />,
  expand: <path d="M14.5 4.5h5v5M9.5 19.5h-5v-5M19.5 4.5L13.5 10.5M4.5 19.5l6-6" />,
  locate: (
    <>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <path d="M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5" />
    </>
  ),
  'three-d': (
    <>
      <path d="M12 3.5l7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7z" />
      <path d="M4.5 7.7L12 12l7.5-4.3M12 12v8.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4l9 15.5H3z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.2" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.8 5.8A9.5 9.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.6M14.2 18.2a9.5 9.5 0 0 1-2.2.3C6 18.5 2.5 12 2.5 12A17 17 0 0 1 6.6 7.4" />
    </>
  ),
}

export const ICON_NAMES = [...LANDING_NAMES, ...Object.keys(PATHS)]

/**
 * <Icon name="search" size={20} title="Search" />. Decorative (aria-hidden) unless a title is given.
 * Unknown names render nothing and warn once in development.
 */
export function Icon({ name, size = 20, title, className, style, strokeWidth = 2 }) {
  if (LANDING_NAMES.includes(name)) return <LandingIcon name={name} size={size} title={title} className={className} style={style} />
  const body = PATHS[name]
  if (!body) {
    if (import.meta.env?.DEV) console.warn(`[daylight] unknown icon "${name}"`)
    return null
  }
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
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

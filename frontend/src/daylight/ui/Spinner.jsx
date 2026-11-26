import s from './Spinner.module.css'

/** A small drawn spinner. Decorative; pair it with text or aria-busy. */
export function Spinner({ size = 20, className }) {
  return (
    <svg className={`${s.spin} ${className || ''}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

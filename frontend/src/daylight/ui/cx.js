/** Join class names, skipping falsy ones. */
export const cx = (...xs) => xs.filter(Boolean).join(' ')

import { Sheet } from './Sheet.jsx'

/**
 * <Dialog open onClose title actions={...}> A centred confirmation card on every screen
 * (a bottom sheet would bury a yes/no question on a phone less than a card does).
 */
export function Dialog({ open, onClose, title, actions, children }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} placement="center" footer={actions}>
      {children}
    </Sheet>
  )
}

import { useEffect, useRef } from 'react'

type ModalProps = {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  width?: number
}

export default function Modal({ open, title, onClose, children, width = 520 }: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modalBackdrop" onClick={onClose} aria-hidden="true">
      <div
        className="modalCard"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        ref={ref}
      >
        {title && <h2 className="modalTitle">{title}</h2>}
        <button className="modalClose" onClick={onClose} aria-label="Dialog schließen">×</button>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  )
}

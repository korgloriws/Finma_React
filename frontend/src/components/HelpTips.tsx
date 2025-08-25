import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

type HelpTip = {
  title?: string
  content: string
}

export default function HelpTips({ title = 'Ajuda', tips, buttonAriaLabel = 'Abrir ajuda' }: {
  title?: string
  tips: HelpTip[]
  buttonAriaLabel?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        aria-haspopup="dialog"
        aria-label={buttonAriaLabel}
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
        title="Ajuda"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true"></div>
          <div className="absolute left-1/2 top-8 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 w-[min(92vw,560px)] bg-card border border-border rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">{title}</h3>
              <button
                aria-label="Fechar ajuda"
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-muted/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-auto">
              {tips.map((t, idx) => (
                <div key={idx} className="bg-muted/30 border border-border rounded-lg p-3">
                  {t.title && <div className="text-sm font-medium text-foreground mb-1">{t.title}</div>}
                  <div className="text-sm text-muted-foreground leading-relaxed">{t.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



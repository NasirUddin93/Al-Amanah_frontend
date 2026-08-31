import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  overlayClassName?: string
}

export function Dialog({ open, onOpenChange, children, className, overlayClassName }: DialogProps) {
  if (!open) return null
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto", className)}>
      <div
        className={cn("fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity", overlayClassName)}
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 flex items-center justify-center w-full pointer-events-none my-auto">
        <div className="pointer-events-auto w-full flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  )
}

export const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200 m-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
DialogContent.displayName = "DialogContent"

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight text-slate-900", className)} {...props} />
  )
)
DialogTitle.displayName = "DialogTitle"

export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-slate-500", className)} {...props} />
  )
)
DialogDescription.displayName = "DialogDescription"

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

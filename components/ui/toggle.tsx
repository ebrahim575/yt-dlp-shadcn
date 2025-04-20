import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleProps extends React.HTMLAttributes<HTMLButtonElement> {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
}

function Toggle({ pressed, onPressedChange, className, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      data-state={pressed ? "on" : "off"}
      className={cn(
        "inline-flex items-center justify-center rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "bg-muted hover:bg-muted/80",
        "relative h-10 w-24",
        className
      )}
      onClick={() => onPressedChange(!pressed)}
      {...props}
    >
      <span
        className={cn(
          "absolute left-0 top-0 h-10 w-12 rounded-full transition-transform",
          pressed ? "translate-x-12 bg-white text-black" : "translate-x-0 bg-background"
        )}
      />
      <span className={cn(
        "absolute left-2 text-xs lowercase",
        pressed ? "text-black" : "text-foreground"
      )}>mp3</span>
      <span className={cn(
        "absolute right-2 text-xs lowercase",
        !pressed ? "text-black" : "text-foreground"
      )}>mp4</span>
    </button>
  )
}

export { Toggle } 
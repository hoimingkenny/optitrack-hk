import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        success:
          "border-transparent bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
        warning:
          "border-transparent bg-amber-500/20 text-amber-500 border-amber-500/30",
        danger:
          "border-transparent bg-red-500/20 text-red-500 border-red-500/30",
        info:
          "border-transparent bg-blue-500/20 text-blue-500 border-blue-500/30",
        cyan:
          "border-transparent bg-cyan-500/20 text-cyan-500 border-cyan-500/30",
        purple:
          "border-transparent bg-purple-500/20 text-purple-500 border-purple-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

// Pre-styled badges for trade status
export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
    'Open': 'info',
    'Closed': 'success',
    'Expired': 'default',
    'Exercised': 'warning',
    'Lapsed': 'default',
  };
  const variant = statusMap[status] || 'info';
  return <Badge variant={variant}>{status}</Badge>;
}

// Pre-styled badges for trade direction
export function DirectionBadge({ direction }: { direction: string }) {
  const variant = direction === 'Sell' ? 'danger' : 'success';
  return <Badge variant={variant}>{direction}</Badge>;
}

// Pre-styled badges for option type
export function OptionTypeBadge({ type }: { type: string }) {
  const variant = type === 'Call' ? 'cyan' : 'purple';
  return <Badge variant={variant}>{type}</Badge>;
}

export { Badge, badgeVariants }
export default Badge

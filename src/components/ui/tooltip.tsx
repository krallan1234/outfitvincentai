import * as React from "react";
import { cn } from "@/lib/utils";

// Safe no-op tooltip primitives to avoid Radix-related runtime issues
// Keeps API-compatible exports so the rest of the app continues to work

export const TooltipProvider: React.FC<React.PropsWithChildren<{ delayDuration?: number }>> = ({ children }) => (
  <>{children}</>
);

export const Tooltip: React.FC<React.PropsWithChildren> = ({ children }) => <>{children}</>;

type TriggerProps = React.HTMLAttributes<HTMLElement> & { asChild?: boolean };
export const TooltipTrigger = React.forwardRef<HTMLElement, TriggerProps>(
  ({ asChild, children, className, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, { ref, ...props } as any);
    }
    return (
      <span ref={ref as any} className={className} {...props}>
        {children}
      </span>
    );
  }
);
TooltipTrigger.displayName = "TooltipTrigger";

type ContentProps = React.HTMLAttributes<HTMLDivElement> & { side?: any; align?: any; sideOffset?: number; hidden?: boolean };
export const TooltipContent = React.forwardRef<HTMLDivElement, ContentProps>(
  ({ className, hidden, children, ...props }, ref) => {
    if (hidden) return null;
    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          "z-50 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TooltipContent.displayName = "TooltipContent";

export default Tooltip;

import * as React from "react";
import { cn } from "@/lib/utils";

// Lightweight fallback tooltip stubs to avoid Radix crash in dev.
// Providers/components render children without any tooltip behavior.
const TooltipProvider: React.FC<React.PropsWithChildren<{ delayDuration?: number }>> = ({ children }) => <>{children}</>;

const Tooltip: React.FC<React.PropsWithChildren<React.ComponentPropsWithoutRef<'div'>>> = ({ children }) => <>{children}</>;

const TooltipTrigger = React.forwardRef<HTMLElement, React.PropsWithChildren<{ asChild?: boolean } & React.HTMLAttributes<HTMLElement>>>(
  ({ children, ..._props }, ref) => {
    if (React.isValidElement(children)) {
      // Attach ref if possible, ignore other props for safety
      // @ts-ignore
      return React.cloneElement(children, { ref });
    }
    return <span ref={ref as any}>{children}</span>;
  }
);
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { [key: string]: any }>(
  ({ className, style, children, ..._rest }, _ref) => {
    // Intentionally render nothing to disable tooltip UI while keeping layout intact
    return (
      <div className={cn(className)} style={{ display: 'none', ...(style || {}) }} aria-hidden>
        {children}
      </div>
    );
  }
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

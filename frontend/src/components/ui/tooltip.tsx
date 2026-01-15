import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible ? (
        <span
          role="tooltip"
          className={cn(
            "absolute z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow",
            side === "top" && "bottom-full mb-2",
            side === "bottom" && "top-full mt-2",
            side === "left" && "right-full mr-2",
            side === "right" && "left-full ml-2"
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

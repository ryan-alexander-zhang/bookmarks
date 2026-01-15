"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type HoverCardContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

function useHoverCard() {
  const context = React.useContext(HoverCardContext);
  if (!context) {
    throw new Error("HoverCard components must be used within HoverCard");
  }
  return context;
}

interface HoverCardProps {
  children: React.ReactNode;
}

export function HoverCard({ children }: HoverCardProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <HoverCardContext.Provider value={{ open, setOpen }}>
      <span className="relative inline-flex">{children}</span>
    </HoverCardContext.Provider>
  );
}

interface HoverCardTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function HoverCardTrigger({ children, asChild }: HoverCardTriggerProps) {
  const { setOpen } = useHoverCard();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onMouseEnter?: React.MouseEventHandler;
      onMouseLeave?: React.MouseEventHandler;
      onFocus?: React.FocusEventHandler;
      onBlur?: React.FocusEventHandler;
    }>;
    return React.cloneElement(child, {
      onMouseEnter: (event) => {
        child.props.onMouseEnter?.(event);
        setOpen(true);
      },
      onMouseLeave: (event) => {
        child.props.onMouseLeave?.(event);
        setOpen(false);
      },
      onFocus: (event) => {
        child.props.onFocus?.(event);
        setOpen(true);
      },
      onBlur: (event) => {
        child.props.onBlur?.(event);
        setOpen(false);
      }
    });
  }

  return (
    <span
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
    </span>
  );
}

interface HoverCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function HoverCardContent({ children, className }: HoverCardContentProps) {
  const { open } = useHoverCard();

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute left-0 top-full z-50 mt-2 w-[320px] rounded-md border border-slate-200 bg-white text-slate-900 shadow-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

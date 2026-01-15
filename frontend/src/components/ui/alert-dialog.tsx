"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AlertDialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function useAlertDialog() {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error("AlertDialog components must be used within AlertDialog");
  }
  return context;
}

interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const value = isControlled ? open : internalOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return (
    <AlertDialogContext.Provider value={{ open: value, setOpen }}>{children}</AlertDialogContext.Provider>
  );
}

interface AlertDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function AlertDialogTrigger({ children, asChild }: AlertDialogTriggerProps) {
  const { setOpen } = useAlertDialog();
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: React.MouseEventHandler }>
    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event);
        setOpen(true);
      }
    });
  }
  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

interface AlertDialogContentProps {
  children: React.ReactNode;
}

export function AlertDialogContent({ children }: AlertDialogContentProps) {
  const { open, setOpen } = useAlertDialog();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-md border bg-background p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function AlertDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-sm font-semibold", className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex justify-end gap-2", className)} {...props} />;
}

interface AlertDialogActionProps extends React.ComponentProps<typeof Button> {
  closeOnClick?: boolean;
}

export function AlertDialogAction({ closeOnClick = true, onClick, ...props }: AlertDialogActionProps) {
  const { setOpen } = useAlertDialog();
  return (
    <Button
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (closeOnClick) {
          setOpen(false);
        }
      }}
    />
  );
}

export function AlertDialogCancel({ onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { setOpen } = useAlertDialog();
  return (
    <Button
      variant="outline"
      {...props}
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
    />
  );
}

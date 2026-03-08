import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
};

const buttonVariants = (
  variant: ButtonProps["variant"],
  size: ButtonProps["size"],
  className?: string
) =>
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    variant === "default" &&
      "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    variant === "destructive" &&
      "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    variant === "outline" &&
      "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    variant === "secondary" &&
      "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
    variant === "link" && "text-primary underline-offset-4 hover:underline",
    size === "default" && "h-9 px-4 py-2",
    size === "sm" && "h-8 rounded-md px-3 text-xs",
    size === "lg" && "h-10 rounded-md px-8",
    size === "icon" && "size-9",
    className
  );

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref as React.Ref<HTMLButtonElement>}
        className={buttonVariants(variant, size, className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

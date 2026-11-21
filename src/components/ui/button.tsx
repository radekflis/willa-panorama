import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variantClasses = {
      primary: "btn-lab-primary",
      secondary: "btn-lab-secondary",
      ghost: "bg-transparent text-[#111111] hover:bg-[#F5F5F5]",
    }[variant];

    const sizeClasses = {
      sm: "h-9 px-3.5 text-xs rounded-[8px]",
      md: "h-10 px-4 text-sm rounded-[10px]",
      lg: "h-12 px-6 text-sm rounded-[10px]",
    }[size];

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variantClasses,
          sizeClasses,
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

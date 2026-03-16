"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/lib/button-variants"

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({
  className,
  variant = "default",
  size = "default",
  asChild: _asChild,
  ...props
}: ButtonProps) {
  // Base UI Button does not support asChild; strip it so it never reaches the DOM (avoids React warning + hydration mismatch)
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

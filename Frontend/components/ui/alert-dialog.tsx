"use client"

import * as React from "react"
import * as AlertDialoEVrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialoEVrimitive.Root

const AlertDialogTrigger = AlertDialoEVrimitive.Trigger

const AlertDialoEVortal = AlertDialoEVrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialoEVrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialoEVrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialoEVrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialoEVrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialoEVrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialoEVrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialoEVortal>
    <AlertDialogOverlay />
    <AlertDialoEVrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className,
      )}
      {...props}
    />
  </AlertDialoEVortal>
))
AlertDialogContent.displayName = AlertDialoEVrimitive.Content.displayName

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialoEVrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialoEVrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialoEVrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
))
AlertDialogTitle.displayName = AlertDialoEVrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialoEVrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialoEVrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialoEVrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
AlertDialogDescription.displayName = AlertDialoEVrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialoEVrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialoEVrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialoEVrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
))
AlertDialogAction.displayName = AlertDialoEVrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialoEVrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialoEVrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialoEVrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialoEVrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialoEVortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}

"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  variant?: 'fullscreen' | 'spinner' | 'text';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function Loading({ 
  className, 
  variant = 'fullscreen',
  size = 'md',
  text = 'Loading...'
}: LoadingProps) {
  if (variant === 'spinner') {
    return (
      <div className={cn("flex justify-center items-center", className)}>
        <div className={cn(
          "animate-spin rounded-full border-b-2 border-gray-900",
          {
            'h-4 w-4': size === 'sm',
            'h-8 w-8': size === 'md',
            'h-12 w-12': size === 'lg',
          }
        )} />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn("text-center", className)}>
        <p className={cn(
          "text-gray-500",
          {
            'text-sm': size === 'sm',
            'text-base': size === 'md',
            'text-lg': size === 'lg',
          }
        )}>{text}</p>
      </div>
    );
  }

  return (
    <div className={cn("fixed inset-0 bg-white flex flex-col items-center justify-center", className)}>
      <div className="relative w-48 h-48 mb-8">
        <Image
          src="/asset-iq-logo.svg"
          alt="AssetIQ Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-primary animate-loading-bar" />
      </div>
    </div>
  );
} 
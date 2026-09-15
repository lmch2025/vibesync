"use client";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function VibeLogo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <Image
        src="/icon-512.png"
        alt="vivilov logo"
        width={36}
        height={36}
        className="object-cover rounded-xl shadow-md"
        priority
      />
      {withText && (
        <span className="font-serif font-light text-2xl tracking-widest lowercase flex items-center">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">vivi</span>
          <span className="text-foreground">lov</span>
        </span>
      )}
    </span>
  );
}

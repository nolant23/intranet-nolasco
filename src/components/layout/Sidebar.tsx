"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Image from "next/image";
import { getAreaFromPathname, getSidebarLinksForArea } from "@/lib/navigation";

export function Sidebar({ permissions }: { permissions: any }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const area = getAreaFromPathname(pathname);
  const navigation = getSidebarLinksForArea(area);

  const NavLinks = ({ collapsed = false }: { collapsed?: boolean }) => (
    <nav className={cn("flex flex-col gap-3 w-full", collapsed ? "px-2" : "px-4")}>
      {navigation.map((item) => {
        const canRead = permissions?.[item.permKey]?.READ;
        if (!canRead && permissions) return null;

        const isActive = pathname.startsWith(item.href);
        return (
          <Link key={item.name} href={item.href} onClick={() => setOpen(false)} title={item.name}>
            <span
              className={cn(
                "flex items-center rounded-xl py-4 transition-all duration-200",
                collapsed ? "justify-center px-0" : "gap-4 px-4",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_4px_16px_rgba(134,45,41,0.3)]"
                  : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("shrink-0", collapsed ? "h-7 w-7" : "h-6 w-6")} strokeWidth={2.5} />
              {!collapsed && <span className="text-[16px] font-black uppercase tracking-wider">{item.name}</span>}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
        {/* Mobile Sidebar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger id="mobile-menu-trigger" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-12 w-12 text-slate-800")}>
              <Menu className="h-8 w-8" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0 flex flex-col bg-white border-r border-slate-200">
              <div className="flex items-center justify-center p-6 border-b border-slate-200 bg-white">
                <Image src="/images/logo.png" alt="Nolasco Ascensori Logo" width={160} height={160} className="object-contain" priority />
              </div>
              <div className="flex-1 overflow-auto bg-slate-50 py-4">
                <NavLinks collapsed={false} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-black text-xl tracking-tight text-slate-900 uppercase">Intranet</span>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r border-slate-200 bg-white min-h-screen shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10 relative transition-all duration-300",
          isCollapsed ? "w-24" : "w-72"
        )}
      >
        <Button 
          variant="secondary" 
          size="icon" 
          className="absolute -right-4 top-8 rounded-full border border-slate-200 shadow-sm z-20 w-8 h-8 hidden md:flex items-center justify-center bg-white hover:bg-slate-100"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-600" /> : <ChevronLeft className="w-4 h-4 text-slate-600" />}
        </Button>

        <div className={cn("flex items-center justify-center border-b border-slate-200 bg-white transition-all duration-300", isCollapsed ? "p-4 h-[80px]" : "p-6")}>
          <Link href="/servizi">
            {isCollapsed ? (
              <div className="font-black text-3xl text-primary tracking-tighter hover:scale-105 transition-transform">N.</div>
            ) : (
              <Image src="/images/logo.png" alt="Nolasco Ascensori Logo" width={180} height={80} className="object-contain hover:scale-105 transition-transform duration-300" priority />
            )}
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-6 bg-slate-50">
          <NavLinks collapsed={isCollapsed} />
        </div>
      </aside>
    </>
  );
}

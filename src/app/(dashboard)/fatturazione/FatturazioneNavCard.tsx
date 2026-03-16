"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";

type Props = {
  href: string;
  title: string;
  description: string;
  gradient: string;
};

export function FatturazioneNavCard({ href, title, description, gradient }: Props) {
  return (
    <a href={href} className="block w-full text-left group no-underline">
      <Card
        className={`h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 text-white overflow-hidden relative ${gradient}`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
          <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
            {title}
          </CardTitle>
          <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
            <Receipt className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <p className="text-base text-white/90 font-bold uppercase tracking-wider">
            {description}
          </p>
        </CardContent>
      </Card>
    </a>
  );
}

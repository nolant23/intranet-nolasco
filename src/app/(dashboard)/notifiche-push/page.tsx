import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PushNotificationsSettings } from "./components/PushNotificationsSettings";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NotifichePushPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-slate-600">
        <Link href="/" className="p-1 rounded hover:bg-slate-100">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm font-medium">Impostazioni</span>
      </div>
      <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
        Notifiche push
      </h1>
      <PushNotificationsSettings />
    </div>
  );
}

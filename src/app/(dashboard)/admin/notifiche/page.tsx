import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminNotificheClient } from "./components/AdminNotificheClient";
import { getNotificationSettings, getUsersForNotificationTest } from "./actions";

export default async function AdminNotifichePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");

  const [settingsRes, usersRes] = await Promise.all([
    getNotificationSettings(),
    getUsersForNotificationTest(),
  ]);

  const settings = settingsRes.ok ? settingsRes.data : [];
  const users = usersRes.ok ? usersRes.data : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-slate-600">
        <Link href="/admin" className="p-1 rounded hover:bg-slate-100">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm font-medium">Dashboard Admin</span>
      </div>
      <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
        Impostazioni notifiche push
      </h1>
      <p className="text-slate-600 text-sm">
        Configura quali eventi inviano notifiche e a chi. Le notifiche vengono inviate solo agli utenti che le hanno abilitate dalla propria pagina Impostazioni.
      </p>
      <AdminNotificheClient initialSettings={settings} users={users} />
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, UserCog, Shield, Bell } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const canUtenti = permissions?.Utenti?.READ;
  const canImpostazioni = permissions?.Impostazioni?.READ;

  if (!canUtenti && !canImpostazioni) {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
            Dashboard Admin
          </h1>
          <p className="text-slate-500 text-lg font-medium mt-2">
            Gestione utenti e permessi
          </p>
        </div>
        <div className="flex items-center gap-3 text-primary bg-primary/10 px-6 py-4 rounded-2xl font-black tracking-wide uppercase text-sm">
          <Shield className="h-6 w-6" strokeWidth={2.5} />
          <span>Admin</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {canUtenti ? (
          <Link href="/utenti" className="block group">
            <Card className="hover:shadow-xl transition-all duration-300 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] group-hover:-translate-y-1 bg-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <UserCog className="w-32 h-32 text-slate-900" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-slate-400 group-hover:text-primary transition-colors">
                  Utenti
                </CardTitle>
                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <UserCog className="h-8 w-8 text-slate-700 group-hover:text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-base text-slate-500 font-bold uppercase tracking-wider">
                  Creazione e gestione
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : null}

        {canImpostazioni ? (
          <Link href="/impostazioni" className="block group">
            <Card className="hover:shadow-xl transition-all duration-300 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] group-hover:-translate-y-1 bg-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Settings className="w-32 h-32 text-slate-900" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-slate-400 group-hover:text-primary transition-colors">
                  Impostazioni
                </CardTitle>
                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <Settings className="h-8 w-8 text-slate-700 group-hover:text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-base text-slate-500 font-bold uppercase tracking-wider">
                  Permessi e ruoli
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : null}

        {user?.role === "ADMIN" ? (
          <Link href="/admin/notifiche" className="block group">
            <Card className="hover:shadow-xl transition-all duration-300 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] group-hover:-translate-y-1 bg-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Bell className="w-32 h-32 text-slate-900" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-slate-400 group-hover:text-primary transition-colors">
                  Notifiche
                </CardTitle>
                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <Bell className="h-8 w-8 text-slate-700 group-hover:text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-base text-slate-500 font-bold uppercase tracking-wider">
                  Eventi e invio test
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : null}
      </div>
    </div>
  );
}


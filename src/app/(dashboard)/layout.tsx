import { TopBar } from "@/components/layout/TopBar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TecnicoTopBar } from "@/components/layout/TecnicoTopBar";
import { TecnicoMobileNav } from "@/components/layout/TecnicoMobileNav";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { OfflineSyncBanner } from "@/components/OfflineSyncBanner";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPermissionsForRole } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userPermissions = await getPermissionsForRole(user.role);
  const isTecnico = user.role === "TECNICO";

  if (isTecnico) {
    return (
      <OfflineProvider>
        <div className="min-h-screen w-full flex flex-col">
          <TecnicoTopBar userName={user.name} permissions={userPermissions} />
          <OfflineSyncBanner />
          <main className="flex-1 p-3 md:p-6 overflow-y-auto pb-20 md:pb-6">
            {children}
          </main>
          {modal}
          <TecnicoMobileNav permissions={userPermissions} />
        </div>
      </OfflineProvider>
    );
  }

  return (
    <OfflineProvider>
      <div className="min-h-screen w-full flex flex-col">
        <TopBar userName={user.name} userRole={user.role} permissions={userPermissions} />
        <OfflineSyncBanner />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
          {children}
        </main>
        {modal}
        <MobileBottomNav userRole={user.role} permissions={userPermissions} />
      </div>
    </OfflineProvider>
  );
}

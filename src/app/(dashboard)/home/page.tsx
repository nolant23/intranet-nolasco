import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HomeClient } from "./HomeClient";

export default async function HomeSearchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "TECNICO") redirect("/");

  return <HomeClient />;
}


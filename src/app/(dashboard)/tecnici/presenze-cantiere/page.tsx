import { redirect } from "next/navigation";

/** Redirect legacy URL to new path under Dashboard Presenze. */
export default function TecnicoPresenzeCantiereRedirect() {
  redirect("/tecnici/presenze/presenze-cantiere");
}

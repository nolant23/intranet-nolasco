"use client";

import dynamic from "next/dynamic";

const FieldComunePieCharts = dynamic(
  () =>
    import("./FieldComunePieCharts").then((m) => m.FieldComunePieCharts),
  {
    ssr: false,
    loading: () => (
      <div className="text-sm text-slate-500 font-medium py-10 text-center">
        Caricamento grafici...
      </div>
    ),
  }
);

export function FieldComunePieChartsClient({
  impiantiDaManutenere,
}: {
  impiantiDaManutenere: any[];
}) {
  return <FieldComunePieCharts impiantiDaManutenere={impiantiDaManutenere} />;
}


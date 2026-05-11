export type SimpleTableRow = {
  id: string;
  cells: (string | number | React.ReactNode)[];
};

export function SimpleTable({
  headers,
  rows,
  emptyText = "Aucun élément.",
}: {
  headers: string[];
  rows: SimpleTableRow[];
  emptyText?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#3D4F63]/15 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#3D4F63]/10">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-10 text-center text-sm text-[#3D4F63]/60"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-[#3D4F63]/5">
                {r.cells.map((c, i) => (
                  <td key={i} className="px-4 py-3 text-sm text-[#1A1F2A]">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

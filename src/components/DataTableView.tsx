import type { TableData } from "../types/agent";

export default function DataTableView({ table }: { table: TableData }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-700">
            {table.columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-4 py-2.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-t border-gray-50 text-gray-700 transition hover:bg-gray-50"
            >
              {row.map((cell, ci) => (
                <td key={ci} className="whitespace-nowrap px-4 py-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

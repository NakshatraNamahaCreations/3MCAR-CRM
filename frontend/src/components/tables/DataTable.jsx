import { Loading, EmptyState } from '../common/ui.jsx';

/**
 * Generic data table.
 * columns: [{ key, label, render?(row), className? }]
 * rows: array of objects
 */
const DataTable = ({ columns, rows, loading, emptyMessage, rowKey = '_id', onRowClick }) => {
  if (loading) return <Loading />;
  if (!rows?.length) return <EmptyState message={emptyMessage} />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-2.5 font-semibold ${c.className || ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row[rowKey]}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-slate-100 hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-2.5 text-slate-700 ${c.className || ''}`}>
                  {c.render ? c.render(row, index) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;

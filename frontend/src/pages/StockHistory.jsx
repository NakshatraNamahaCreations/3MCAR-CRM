import { useEffect, useMemo, useState } from 'react';
import stockMovementApi from '../api/stockMovementApi.js';
import productApi from '../api/productApi.js';
import { Button, PageHeader, Input, Select, StatusBadge, Loading } from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import { prettyDate } from '../utils/dateUtils.js';

const PAGE_SIZE = 15;

const MOVEMENT_TYPES = [
  { value: 'stock_in', label: 'Stock In' },
  { value: 'stock_out', label: 'Stock Out' },
  { value: 'usage', label: 'Usage' },
  { value: 'return', label: 'Return' },
  { value: 'adjustment', label: 'Adjustment' },
];
const labelize = (v) => MOVEMENT_TYPES.find((m) => m.value === v)?.label || v || '—';
const isIncrease = (t) => t === 'stock_in' || t === 'return';

const dateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return `${prettyDate(d)} ${dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function StockHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.movementType = typeFilter;
      if (productFilter) params.productId = productFilter;
      const data = await stockMovementApi.list(params);
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    productApi.list().then((d) => setProducts(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [typeFilter, productFilter]);

  const searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.productId?.productName, r.productId?.sku, r.remarks, r.referenceType]
        .filter(Boolean).join(' ').toLowerCase().includes(t)
    );
  }, [rows, search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(searched, () => setPage(1));

  useEffect(() => { setPage(1); }, [search, typeFilter, productFilter]);
  const paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_r, i) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</span> },
    { key: 'date', label: 'Date & Time', render: (r) => <span className="text-slate-600">{dateTime(r.createdAt)}</span> },
    {
      key: 'product', label: 'Product',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-700">{r.productId?.productName || '—'}</p>
          {r.productId?.sku && <p className="text-xs text-slate-400">{r.productId.sku}</p>}
        </div>
      ),
    },
    { key: 'type', label: 'Type', render: (r) => <StatusBadge status={r.movementType} /> },
    {
      key: 'quantity', label: 'Qty', className: 'text-right',
      render: (r) => {
        const unit = r.productId?.unitType ? ` ${r.productId.unitType}` : '';
        const inc = isIncrease(r.movementType);
        return (
          <span className={`font-semibold ${inc ? 'text-emerald-600' : 'text-red-600'}`}>
            {inc ? '+' : '−'}{Number(r.quantity || 0).toLocaleString('en-IN')}{unit}
          </span>
        );
      },
    },
    {
      key: 'balance', label: 'Stock (before → after)', className: 'text-right',
      render: (r) => (
        <span className="text-slate-500">
          {Number(r.previousStock ?? 0).toLocaleString('en-IN')} <span className="text-slate-300">→</span>{' '}
          <span className="font-medium text-slate-700">{Number(r.newStock ?? 0).toLocaleString('en-IN')}</span>
        </span>
      ),
    },
    { key: 'reference', label: 'Reference', render: (r) => <span className="text-slate-500">{labelize(r.referenceType) === r.referenceType ? (r.referenceType || '—').replace(/_/g, ' ') : r.referenceType?.replace(/_/g, ' ') || '—'}</span> },
    { key: 'remarks', label: 'Remarks', render: (r) => <span className="text-slate-500">{r.remarks || '—'}</span> },
    { key: 'branch', label: 'Branch', render: (r) => <span className="text-slate-500">{r.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'By', render: (r) => <span className="text-slate-500">{r.createdBy?.name || '—'}</span> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Stock Utilization History" subtitle="Every stock movement — in, out, usage, returns and adjustments." />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Input label="Search" placeholder="Product / SKU / remarks…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select label="Movement Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {MOVEMENT_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
          <Select label="Product" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="">All products</option>
            {products.map((p) => <option key={p._id} value={p._id}>{p.productName}</option>)}
          </Select>
          {_buControls}
        </div>
      </div>

      {loading ? (
        <Loading label="Loading stock history…" />
      ) : (
        <>
          <DataTable columns={columns} rows={paged} emptyMessage="No stock movements found." rowKey="_id" />
          <Pagination page={page} pageSize={PAGE_SIZE} total={_buFiltered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

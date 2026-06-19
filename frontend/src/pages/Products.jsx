import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import productApi from '../api/productApi.js';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import {
  Button,
  PageHeader,
  Input,
  Select,
  StatusBadge,
  Loading,
  Modal,
  ConfirmDialog,
} from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';

const UNIT_TYPES = ['pcs', 'ml', 'litre', 'meter', 'sqft', 'roll', 'bottle', 'packet'];

const PAGE_SIZE = 12;

const emptyForm = {
  productName: '',
  sku: '',
  category: '',
  brand: '',
  unitType: 'pcs',
  purchasePrice: '',
  sellingPrice: '',
  gstPercentage: '',
  currentStock: '',
  minimumStock: '',
  openingStock: '',
  stockLocation: '',
  supplierName: '',
  isPPF: false,
  status: 'active',
};

export default function Products() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [stockModal, setStockModal] = useState(null); // { row, mode: 'in'|'out' }
  const [stockForm, setStockForm] = useState({ quantity: '', remarks: '' });
  const [stockSaving, setStockSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await productApi.list();
      setRows(Array.isArray(data) ? data : data?.items || data?.products || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      productName: row.productName ?? '',
      sku: row.sku ?? '',
      category: row.category ?? '',
      brand: row.brand ?? '',
      unitType: row.unitType ?? 'pcs',
      purchasePrice: row.purchasePrice ?? '',
      sellingPrice: row.sellingPrice ?? '',
      gstPercentage: row.gstPercentage ?? '',
      currentStock: row.currentStock ?? '',
      minimumStock: row.minimumStock ?? '',
      openingStock: row.openingStock ?? '',
      stockLocation: row.stockLocation ?? '',
      supplierName: row.supplierName ?? '',
      isPPF: !!row.isPPF,
      status: row.status ?? 'active',
    });
    setFormOpen(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        purchasePrice: form.purchasePrice === '' ? undefined : Number(form.purchasePrice),
        sellingPrice: form.sellingPrice === '' ? undefined : Number(form.sellingPrice),
        gstPercentage: form.gstPercentage === '' ? undefined : Number(form.gstPercentage),
        currentStock: form.currentStock === '' ? undefined : Number(form.currentStock),
        minimumStock: form.minimumStock === '' ? undefined : Number(form.minimumStock),
        openingStock: form.openingStock === '' ? undefined : Number(form.openingStock),
      };
      if (editing) {
        await productApi.update(editing._id, payload);
        toast.success('Product updated');
      } else {
        await productApi.create(payload);
        toast.success('Product created');
      }
      setFormOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const id = deleteTarget?._id;
    setDeleteTarget(null);
    if (!id) return;
    await productApi.remove(id);
    toast.success('Product deleted');
    await load();
  };

  const openStock = (row, mode) => {
    setStockModal({ row, mode });
    setStockForm({ quantity: '', remarks: '' });
  };

  const submitStock = async (e) => {
    e.preventDefault();
    if (!stockModal) return;
    setStockSaving(true);
    try {
      const payload = {
        quantity: stockForm.quantity === '' ? 0 : Number(stockForm.quantity),
        remarks: stockForm.remarks,
      };
      if (stockModal.mode === 'in') {
        await productApi.addStock(stockModal.row._id, payload);
        toast.success('Stock added');
      } else {
        await productApi.reduceStock(stockModal.row._id, payload);
        toast.success('Stock reduced');
      }
      setStockModal(null);
      await load();
    } finally {
      setStockSaving(false);
    }
  };

  const isLow = (row) => Number(row.currentStock) <= Number(row.minimumStock);

  const _searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [rows, search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(_searched, () => setPage(1));

  useEffect(() => {
    setPage(1);
  }, [search]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    {
      key: 'productName',
      label: 'Product',
      render: (row) => (
        <span className={isLow(row) ? 'text-red-600 font-semibold' : ''}>{row.productName}</span>
      ),
    },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    {
      key: 'currentStock',
      label: 'Stock',
      render: (row) => (
        <span className={isLow(row) ? 'text-red-600 font-semibold' : ''}>{row.currentStock}</span>
      ),
    },
    { key: 'minimumStock', label: 'Min Stock' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: 'branch', label: 'Branch', render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'Created By', render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span> },
    {
      key: '_actions',
      label: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1.5 flex-wrap">
          <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); openStock(row, 'in'); }}>
            Stock In
          </Button>
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openStock(row, 'out'); }}>
            Stock Out
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Inventory items, pricing and stock levels"
        actions={<Button onClick={openCreate}>Add Product</Button>}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-4">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Input label="Search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {_buControls}
        </div>
      </div>

      {loading ? (
        <Loading label="Loading products…" />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={_paged}
            loading={loading}
            emptyMessage="No products found"
            rowKey="_id"
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={_buFiltered.length} onPageChange={setPage} />
        </>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Product' : 'Add Product'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitForm} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={submitForm} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Product Name" value={form.productName} onChange={setField('productName')} required />
          <Input label="SKU" value={form.sku} onChange={setField('sku')} />
          <Input label="Category" value={form.category} onChange={setField('category')} />
          <Input label="Brand" value={form.brand} onChange={setField('brand')} />

          <Select label="Unit Type" value={form.unitType} onChange={setField('unitType')}>
            {UNIT_TYPES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </Select>

          <Input label="Purchase Price (₹)" type="number" step="any" value={form.purchasePrice} onChange={setField('purchasePrice')} />
          <Input label="Selling Price (₹)" type="number" step="any" value={form.sellingPrice} onChange={setField('sellingPrice')} />
          <Input label="GST %" type="number" step="any" value={form.gstPercentage} onChange={setField('gstPercentage')} />

          <Input label="Current Stock" type="number" step="any" value={form.currentStock} onChange={setField('currentStock')} />
          <Input label="Minimum Stock" type="number" step="any" value={form.minimumStock} onChange={setField('minimumStock')} />
          <Input label="Opening Stock" type="number" step="any" value={form.openingStock} onChange={setField('openingStock')} />

          <Input label="Stock Location" value={form.stockLocation} onChange={setField('stockLocation')} />
          <Input label="Supplier Name" value={form.supplierName} onChange={setField('supplierName')} />

          <Select label="Status" value={form.status} onChange={setField('status')}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </Select>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mt-6">
            <input type="checkbox" checked={form.isPPF} onChange={setField('isPPF')} className="rounded border-slate-300" />
            Is PPF
          </label>
        </form>
      </Modal>

      {/* Stock In / Out modal */}
      <Modal
        open={!!stockModal}
        onClose={() => setStockModal(null)}
        title={stockModal ? `${stockModal.mode === 'in' ? 'Stock In' : 'Stock Out'} — ${stockModal.row.productName}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStockModal(null)}>Cancel</Button>
            <Button
              variant={stockModal?.mode === 'in' ? 'success' : 'primary'}
              onClick={submitStock}
              disabled={stockSaving}
            >
              {stockSaving ? 'Saving…' : 'Confirm'}
            </Button>
          </>
        }
      >
        <form onSubmit={submitStock} className="space-y-4">
          {stockModal && (
            <p className="text-sm text-slate-500">
              Current stock: <span className="font-semibold text-slate-700">{stockModal.row.currentStock}</span>{' '}
              {stockModal.row.unitType}
            </p>
          )}
          <Input
            label="Quantity"
            type="number"
            step="any"
            min="0"
            value={stockForm.quantity}
            onChange={(e) => setStockForm((s) => ({ ...s, quantity: e.target.value }))}
            required
          />
          <Input
            label="Remarks"
            value={stockForm.remarks}
            onChange={(e) => setStockForm((s) => ({ ...s, remarks: e.target.value }))}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Product"
        message={`Delete "${deleteTarget?.productName || ''}"? This action cannot be undone.`}
      />
    </div>
  );
}

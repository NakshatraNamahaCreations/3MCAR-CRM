import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { serviceApi } from '../api/serviceApi.js';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import {
  Button,
  PageHeader,
  Input,
  Select,
  Textarea,
  StatusBadge,
  Loading,
  Modal,
  ConfirmDialog,
} from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';

const PAGE_SIZE = 12;

const emptyForm = {
  serviceName: '',
  category: '',
  description: '',
  basePrice: '',
  gstPercentage: '',
  estimatedDuration: '',
  status: 'active',
};

export default function Services() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const loadList = async () => {
    setLoading(true);
    try {
      const data = await serviceApi.list();
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const _searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [rows, search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(
    _searched,
    () => setPage(1)
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      serviceName: row.serviceName ?? '',
      category: row.category ?? '',
      description: row.description ?? '',
      basePrice: row.basePrice ?? '',
      gstPercentage: row.gstPercentage ?? '',
      estimatedDuration: row.estimatedDuration ?? '',
      status: row.status ?? 'active',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        basePrice: form.basePrice === '' ? 0 : Number(form.basePrice),
        gstPercentage:
          form.gstPercentage === '' ? 0 : Number(form.gstPercentage),
      };
      if (editingId) {
        await serviceApi.update(editingId, payload);
        toast.success('Service updated');
      } else {
        await serviceApi.create(payload);
        toast.success('Service created');
      }
      closeModal();
      await loadList();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = confirmId;
    setConfirmId(null);
    if (!id) return;
    await serviceApi.remove(id);
    toast.success('Service deleted');
    await loadList();
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    { key: 'serviceName', label: 'Service Name' },
    { key: 'category', label: 'Category' },
    {
      key: 'basePrice',
      label: 'Base Price',
      render: (row) => `₹${Number(row.basePrice ?? 0).toLocaleString('en-IN')}`,
    },
    {
      key: 'gstPercentage',
      label: 'GST %',
      render: (row) => `${row.gstPercentage ?? 0}%`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: 'branch', label: 'Branch', render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'Created By', render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span> },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmId(row._id);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Services"
        actions={<Button onClick={openCreate}>Add Service</Button>}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            label="Search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {_buControls}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={_paged}
            loading={loading}
            emptyMessage="No services found"
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={_buFiltered.length}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Service' : 'Add Service'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Service Name"
            value={form.serviceName}
            onChange={setField('serviceName')}
            required
          />
          <Input
            label="Category"
            value={form.category}
            onChange={setField('category')}
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={setField('description')}
            rows={3}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Base Price (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.basePrice}
              onChange={setField('basePrice')}
            />
            <Input
              label="GST %"
              type="number"
              min="0"
              step="0.01"
              value={form.gstPercentage}
              onChange={setField('gstPercentage')}
            />
          </div>
          <Input
            label="Estimated Duration"
            value={form.estimatedDuration}
            onChange={setField('estimatedDuration')}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={setField('status')}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

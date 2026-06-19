import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { jobCardApi } from '../api/jobCardApi.js';
import {
  Button,
  Card,
  PageHeader,
  Input,
  Select,
  StatusBadge,
  Modal,
} from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';

const PAGE_SIZE = 12;

const STATUS_OPTIONS = [
  'created',
  'assigned',
  'work_started',
  'work_completed',
  'invoiced',
  'paid',
  'delivered',
];

const labelize = (v) =>
  String(v || '')
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

// Resolve a possibly-populated reference to a display value.
const refValue = (ref, ...keys) => {
  if (ref == null) return '';
  if (typeof ref === 'string') return ref;
  for (const k of keys) {
    if (ref[k] != null && ref[k] !== '') return ref[k];
  }
  return '';
};

const EMPTY_ASSIGN = { technicianId: '' };
const EMPTY_PRODUCT = { productId: '', quantity: '', notes: '' };
const EMPTY_PPF = { productId: '', area: '', lengthUsed: '', widthUsed: '', notes: '' };

export default function JobCards() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [ppfForm, setPpfForm] = useState(EMPTY_PPF);

  const loadJobCards = async () => {
    setLoading(true);
    try {
      const data = await jobCardApi.list();
      setRows(Array.isArray(data) ? data : data?.items || data?.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobCards();
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = [
        r.jobCardNumber,
        refValue(r.customerId, 'name'),
        refValue(r.vehicleId, 'vehicleNumber', 'registrationNumber'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, search, statusFilter]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(
    filteredRows,
    () => setPage(1),
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page],
  );

  const refreshSelected = async (id) => {
    try {
      const fresh = await jobCardApi.get(id);
      if (fresh) setSelected(fresh);
    } catch {
      // selected stays as-is; list reload below still happens
    }
  };

  const openManage = (row) => {
    setSelected(row);
    setAssignForm(EMPTY_ASSIGN);
    setProductForm(EMPTY_PRODUCT);
    setPpfForm(EMPTY_PPF);
    setManageOpen(true);
  };

  const closeManage = () => {
    if (busy) return;
    setManageOpen(false);
    setSelected(null);
  };

  // Generic workflow runner: performs action, toasts, reloads list + detail.
  const runAction = async (fn, successMsg, resetForm) => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await fn(selected._id);
      toast.success(successMsg);
      if (resetForm) resetForm();
      await refreshSelected(selected._id);
      await loadJobCards();
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = () => {
    if (!assignForm.technicianId.trim()) {
      toast.error('Technician is required');
      return;
    }
    runAction(
      (id) => jobCardApi.assignTechnician(id, { technicianId: assignForm.technicianId.trim() }),
      'Technician assigned',
      () => setAssignForm(EMPTY_ASSIGN),
    );
  };

  const handleStart = () =>
    runAction((id) => jobCardApi.startWork(id), 'Work started');

  const handleAddProduct = () => {
    if (!productForm.productId.trim() || !productForm.quantity) {
      toast.error('Product and quantity are required');
      return;
    }
    runAction(
      (id) =>
        jobCardApi.addProductUsage(id, {
          productId: productForm.productId.trim(),
          quantity: Number(productForm.quantity),
          notes: productForm.notes || undefined,
        }),
      'Product usage added',
      () => setProductForm(EMPTY_PRODUCT),
    );
  };

  const handleAddPPF = () => {
    if (!ppfForm.productId.trim()) {
      toast.error('Product is required');
      return;
    }
    runAction(
      (id) =>
        jobCardApi.addPPFUsage(id, {
          productId: ppfForm.productId.trim(),
          area: ppfForm.area || undefined,
          lengthUsed: ppfForm.lengthUsed ? Number(ppfForm.lengthUsed) : undefined,
          widthUsed: ppfForm.widthUsed ? Number(ppfForm.widthUsed) : undefined,
          notes: ppfForm.notes || undefined,
        }),
      'PPF usage added',
      () => setPpfForm(EMPTY_PPF),
    );
  };

  const handleComplete = () =>
    runAction((id) => jobCardApi.complete(id), 'Job card completed');

  const handleGenerateInvoice = () =>
    runAction((id) => jobCardApi.generateInvoice(id), 'Invoice generated');

  const handleMarkDelivered = () =>
    runAction((id) => jobCardApi.markDelivered(id), 'Marked as delivered');

  const columns = [
    {
      key: 'sl',
      label: 'Sl. No.',
      className: 'w-16',
      render: (_row, index) => (
        <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span>
      ),
    },
    {
      key: 'jobCardNumber',
      label: 'Job Card #',
      render: (row) => row.jobCardNumber || '—',
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (row) => refValue(row.customerId, 'name') || '—',
    },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (row) =>
        refValue(row.vehicleId, 'vehicleNumber', 'registrationNumber') || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (row.status ? <StatusBadge status={row.status} /> : '—'),
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span>,
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/job-cards/${row._id}`);
            }}
          >
            Manage
          </Button>
        </div>
      ),
    },
  ];

  const status = selected?.status;
  const selectedServices = Array.isArray(selected?.selectedServices)
    ? selected.selectedServices
    : [];
  const productUsage = Array.isArray(selected?.productUsage)
    ? selected.productUsage
    : [];
  const ppfUsage = Array.isArray(selected?.ppfUsage) ? selected.ppfUsage : [];

  return (
    <div className="space-y-4">
      <PageHeader title="Job Cards" />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            placeholder="Search number / customer / vehicle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {_buControls}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </Select>
          {(search || statusFilter) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={_paged}
          loading={loading}
          emptyMessage="No job cards found."
          rowKey="_id"
          onRowClick={(row) => navigate(`/job-cards/${row._id}`)}
        />
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={_buFiltered.length}
          onPageChange={setPage}
        />
      </Card>

      <Modal
        open={manageOpen}
        onClose={closeManage}
        size="xl"
        title={
          selected
            ? `Job Card ${selected.jobCardNumber || ''}`.trim()
            : 'Job Card'
        }
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={closeManage} disabled={busy}>
              Close
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-gray-500">Customer</p>
                <p className="font-medium">
                  {refValue(selected.customerId, 'name') || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Vehicle</p>
                <p className="font-medium">
                  {refValue(
                    selected.vehicleId,
                    'vehicleNumber',
                    'registrationNumber',
                  ) || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Technician</p>
                <p className="font-medium">
                  {refValue(selected.technicianId, 'name') || 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Status</p>
                <div className="mt-1">
                  <StatusBadge status={selected.status || 'unknown'} />
                </div>
              </div>
            </div>

            {/* Selected Services */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Selected Services
              </h3>
              {selectedServices.length === 0 ? (
                <p className="text-sm text-gray-400">No services selected.</p>
              ) : (
                <ul className="divide-y rounded border">
                  {selectedServices.map((s, i) => (
                    <li
                      key={s._id || i}
                      className="flex justify-between px-3 py-2 text-sm"
                    >
                      <span>
                        {refValue(s.serviceId, 'name') ||
                          refValue(s, 'name') ||
                          'Service'}
                      </span>
                      <span className="text-gray-500">
                        {s.price != null ? `₹${s.price}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Product Usage */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Product Usage
              </h3>
              {productUsage.length === 0 ? (
                <p className="text-sm text-gray-400">No products recorded.</p>
              ) : (
                <ul className="divide-y rounded border">
                  {productUsage.map((p, i) => (
                    <li
                      key={p._id || i}
                      className="flex justify-between px-3 py-2 text-sm"
                    >
                      <span>
                        {refValue(p.productId, 'name') ||
                          refValue(p, 'name') ||
                          'Product'}
                      </span>
                      <span className="text-gray-500">
                        Qty: {p.quantity ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* PPF Usage */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                PPF Usage
              </h3>
              {ppfUsage.length === 0 ? (
                <p className="text-sm text-gray-400">No PPF usage recorded.</p>
              ) : (
                <ul className="divide-y rounded border">
                  {ppfUsage.map((p, i) => (
                    <li
                      key={p._id || i}
                      className="flex justify-between px-3 py-2 text-sm"
                    >
                      <span>
                        {refValue(p.productId, 'name') ||
                          refValue(p, 'name') ||
                          'PPF'}
                        {p.area ? ` — ${p.area}` : ''}
                      </span>
                      <span className="text-gray-500">
                        {[p.lengthUsed, p.widthUsed]
                          .filter((v) => v != null && v !== '')
                          .join(' x ') || ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Workflow actions */}
            <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Workflow Actions
              </h3>

              {status === 'created' && (
                <div className="space-y-2">
                  <Input
                    label="Technician ID"
                    placeholder="Enter technician/employee ID"
                    value={assignForm.technicianId}
                    onChange={(e) =>
                      setAssignForm({ technicianId: e.target.value })
                    }
                  />
                  <Button
                    variant="primary"
                    onClick={handleAssign}
                    disabled={busy}
                  >
                    Assign Technician
                  </Button>
                </div>
              )}

              {status === 'assigned' && (
                <Button
                  variant="primary"
                  onClick={handleStart}
                  disabled={busy}
                >
                  Start Work
                </Button>
              )}

              {status === 'work_started' && (
                <div className="space-y-5">
                  {/* Add product usage */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Add Product Usage
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Input
                        label="Product ID"
                        value={productForm.productId}
                        onChange={(e) =>
                          setProductForm((f) => ({
                            ...f,
                            productId: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Quantity"
                        type="number"
                        value={productForm.quantity}
                        onChange={(e) =>
                          setProductForm((f) => ({
                            ...f,
                            quantity: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Notes"
                        value={productForm.notes}
                        onChange={(e) =>
                          setProductForm((f) => ({
                            ...f,
                            notes: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleAddProduct}
                      disabled={busy}
                    >
                      Add Product Usage
                    </Button>
                  </div>

                  {/* Add PPF usage */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Add PPF Usage
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        label="Product ID"
                        value={ppfForm.productId}
                        onChange={(e) =>
                          setPpfForm((f) => ({
                            ...f,
                            productId: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Area"
                        value={ppfForm.area}
                        onChange={(e) =>
                          setPpfForm((f) => ({ ...f, area: e.target.value }))
                        }
                      />
                      <Input
                        label="Length Used"
                        type="number"
                        value={ppfForm.lengthUsed}
                        onChange={(e) =>
                          setPpfForm((f) => ({
                            ...f,
                            lengthUsed: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Width Used"
                        type="number"
                        value={ppfForm.widthUsed}
                        onChange={(e) =>
                          setPpfForm((f) => ({
                            ...f,
                            widthUsed: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Input
                      label="Notes"
                      value={ppfForm.notes}
                      onChange={(e) =>
                        setPpfForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                    <Button
                      variant="secondary"
                      onClick={handleAddPPF}
                      disabled={busy}
                    >
                      Add PPF Usage
                    </Button>
                  </div>

                  <div className="border-t pt-3">
                    <Button
                      variant="success"
                      onClick={handleComplete}
                      disabled={busy}
                    >
                      Complete Job
                    </Button>
                  </div>
                </div>
              )}

              {status === 'work_completed' && (
                <Button
                  variant="primary"
                  onClick={handleGenerateInvoice}
                  disabled={busy}
                >
                  Generate Invoice
                </Button>
              )}

              {status === 'paid' && (
                <Button
                  variant="success"
                  onClick={handleMarkDelivered}
                  disabled={busy}
                >
                  Mark Delivered
                </Button>
              )}

              {['invoiced', 'delivered'].includes(status) && (
                <p className="text-sm text-gray-500">
                  {status === 'invoiced'
                    ? 'Awaiting payment before delivery.'
                    : 'This job card has been delivered. No further actions.'}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

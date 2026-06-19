import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import quoteApi from '../api/quoteApi.js';
import serviceApi from '../api/serviceApi.js';
import productApi from '../api/productApi.js';
import termsApi from '../api/termsApi.js';
import {
  Button,
  Card,
  PageHeader,
  Input,
  Select,
  Textarea,
  StatusBadge,
  Modal,
  ConfirmDialog,
} from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
import CustomerSelect from '../components/common/CustomerSelect.jsx';
import { toYMD } from '../utils/dateUtils.js';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ['draft', 'sent', 'rejected', 'confirmed'];

const emptyLineItem = () => ({
  catalogKey: '', // "service:<id>" | "product:<id>" | "custom"
  serviceId: null,
  productId: null,
  itemName: '',
  quantity: 1,
  unitPrice: 0,
  taxPercentage: 0,
});

const emptyForm = () => ({
  customerName: '',
  phone: '',
  vehicleDetails: '',
  discountType: 'percentage',
  discountValue: 0,
  taxType: 'GST',
  gstPercentage: 18,
  termsAndConditions: '',
  lineItems: [emptyLineItem()],
});

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const inr = (v) =>
  '₹' +
  num(v).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATUS_CHOICES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirm' },
  { value: 'rejected', label: 'Reject' },
];

/**
 * Single "Status" button that opens a dropdown of status options.
 * Uses a fixed-positioned menu (anchored to the button) so it isn't clipped by
 * the table's overflow-hidden container.
 */
function StatusMenu({ row, onPick }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  // A confirmed quote is locked — it has already converted to customer/appointment.
  const locked = row.status === 'confirmed';

  const toggle = (e) => {
    e.stopPropagation();
    if (locked) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 144) });
    setOpen((o) => !o);
  };

  if (locked) {
    return (
      <Button size="sm" variant="secondary" disabled title="Confirmed quotes can't change status">
        Confirmed
      </Button>
    );
  }

  return (
    <div className="inline-block" ref={btnRef}>
      <Button size="sm" variant="secondary" onClick={toggle}>
        Status ▾
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: 144 }}
            className="z-50 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {STATUS_CHOICES.filter((c) => c.value !== row.status).map((c) => (
              <button
                key={c.value}
                onClick={(e) => { e.stopPropagation(); setOpen(false); onPick(row, c.value); }}
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Quotes() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Confirm-convert modal (asks appointment date/time)
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [apptForm, setApptForm] = useState({ appointmentDate: '', appointmentTime: '' });
  const [confirming, setConfirming] = useState(false);

  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedTerms, setSelectedTerms] = useState([]); // template ids ticked in the form
  const [pickedCustomerId, setPickedCustomerId] = useState(''); // optional existing-customer prefill
  const [viewQuote, setViewQuote] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Load the formatted PDF into an object URL whenever a quote is opened for viewing.
  useEffect(() => {
    let revoked = false;
    let currentUrl = '';
    if (viewQuote?._id) {
      setPdfLoading(true);
      setPdfUrl('');
      quoteApi
        .pdfObjectUrl(viewQuote._id)
        .then((url) => {
          if (revoked) { window.URL.revokeObjectURL(url); return; }
          currentUrl = url;
          setPdfUrl(url);
        })
        .catch(() => {})
        .finally(() => { if (!revoked) setPdfLoading(false); });
    }
    return () => {
      revoked = true;
      if (currentUrl) window.URL.revokeObjectURL(currentUrl);
    };
  }, [viewQuote]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState(null);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const data = await quoteApi.list(params);
      setRows(Array.isArray(data) ? data : data?.items || data?.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Client-side search (quote #, customer, phone) + date-range filtering.
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((q) => {
      if (term) {
        const hay = [q.quoteNumber, q.customerName, q.phone].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (dateFrom && toYMD(q.createdAt) < dateFrom) return false;
      if (dateTo && toYMD(q.createdAt) > dateTo) return false;
      return true;
    });
  }, [rows, search, dateFrom, dateTo]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(filteredRows, () => setPage(1));

  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo, statusFilter]);
  const pagedRows = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  // Load the services + products catalog once for the line-item picker.
  useEffect(() => {
    (async () => {
      try {
        const [svc, prod, tms] = await Promise.all([
          serviceApi.list({ status: 'active' }).catch(() => []),
          productApi.list({ status: 'active' }).catch(() => []),
          termsApi.list({ status: 'active', appliesTo: 'quote' }).catch(() => []),
        ]);
        setServices(Array.isArray(svc) ? svc : svc?.items || []);
        setProducts(Array.isArray(prod) ? prod : prod?.items || []);
        setTerms(Array.isArray(tms) ? tms : tms?.items || []);
      } catch {
        /* non-fatal — user can still type custom items */
      }
    })();
  }, []);

  // Apply a catalog selection to a line item: fill id, name, price, tax.
  const applyCatalogChoice = (idx, catalogKey) => {
    if (catalogKey === 'custom' || !catalogKey) {
      setForm((f) => ({
        ...f,
        lineItems: f.lineItems.map((li, i) =>
          i === idx ? { ...li, catalogKey: 'custom', serviceId: null, productId: null } : li
        ),
      }));
      return;
    }
    const [kind, id] = catalogKey.split(':');
    let patch = { catalogKey, serviceId: null, productId: null };
    if (kind === 'service') {
      const s = services.find((x) => x._id === id);
      if (s) patch = { ...patch, serviceId: id, itemName: s.serviceName, unitPrice: s.basePrice ?? 0, taxPercentage: s.gstPercentage ?? 0 };
    } else if (kind === 'product') {
      const p = products.find((x) => x._id === id);
      if (p) patch = { ...patch, productId: id, itemName: p.productName, unitPrice: p.sellingPrice ?? 0, taxPercentage: p.gstPercentage ?? 0 };
    }
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((li, i) => (i === idx ? { ...li, ...patch } : li)),
    }));
  };

  // Combine the chosen template contents into one terms string.
  const combineTerms = (ids) =>
    terms.filter((t) => ids.includes(t._id)).map((t) => t.content).join('\n\n');

  const toggleTerm = (id) => {
    setSelectedTerms((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setForm((f) => ({ ...f, termsAndConditions: combineTerms(next) }));
      return next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setPickedCustomerId('');
    const defaults = terms.filter((t) => t.isDefault).map((t) => t._id);
    setSelectedTerms(defaults);
    setForm({ ...emptyForm(), termsAndConditions: combineTerms(defaults) });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setPickedCustomerId('');
    setSelectedTerms([]); // free-text on edit; user can re-tick templates to regenerate
    setForm({
      customerName: row.customerName || '',
      phone: row.phone || '',
      vehicleDetails: row.vehicleDetails || '',
      discountType: row.discountType || 'percentage',
      discountValue: row.discountValue ?? 0,
      taxType: row.taxType || 'GST',
      gstPercentage: row.gstPercentage ?? 18,
      termsAndConditions: row.termsAndConditions || '',
      lineItems:
        Array.isArray(row.lineItems) && row.lineItems.length
          ? row.lineItems.map((li) => {
              const sId = li.serviceId?._id || li.serviceId;
              const pId = li.productId?._id || li.productId;
              return {
                catalogKey: sId ? `service:${sId}` : pId ? `product:${pId}` : 'custom',
                serviceId: sId || null,
                productId: pId || null,
                itemName: li.itemName || '',
                quantity: li.quantity ?? 1,
                unitPrice: li.unitPrice ?? 0,
                taxPercentage: li.taxPercentage ?? 0,
              };
            })
          : [emptyLineItem()],
    });
    setModalOpen(true);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setLineItem = (idx, key, value) =>
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((li, i) =>
        i === idx ? { ...li, [key]: value } : li
      ),
    }));

  const addLineItem = () =>
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLineItem()] }));

  const removeLineItem = (idx) =>
    setForm((f) => ({
      ...f,
      lineItems:
        f.lineItems.length > 1
          ? f.lineItems.filter((_, i) => i !== idx)
          : f.lineItems,
    }));

  const totals = useMemo(() => {
    const subtotal = form.lineItems.reduce(
      (sum, li) => sum + num(li.quantity) * num(li.unitPrice),
      0
    );
    const lineTax = form.lineItems.reduce(
      (sum, li) =>
        sum +
        (num(li.quantity) * num(li.unitPrice) * num(li.taxPercentage)) / 100,
      0
    );
    let discount = 0;
    if (form.discountType === 'percentage') {
      discount = (subtotal * num(form.discountValue)) / 100;
    } else {
      discount = num(form.discountValue);
    }
    const afterDiscount = Math.max(subtotal - discount, 0);
    const gst =
      form.taxType === 'GST'
        ? (afterDiscount * num(form.gstPercentage)) / 100
        : 0;
    const total = afterDiscount + lineTax + gst;
    return { subtotal, discount, lineTax, gst, total };
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        customerName: form.customerName,
        phone: form.phone,
        vehicleDetails: form.vehicleDetails,
        discountType: form.discountType,
        discountValue: num(form.discountValue),
        taxType: form.taxType,
        gstPercentage: num(form.gstPercentage),
        termsAndConditions: form.termsAndConditions,
        lineItems: form.lineItems.map((li) => ({
          serviceId: li.serviceId || undefined,
          productId: li.productId || undefined,
          itemName: li.itemName,
          quantity: num(li.quantity),
          unitPrice: num(li.unitPrice),
          taxPercentage: num(li.taxPercentage),
        })),
      };
      if (editing) {
        await quoteApi.update(editing._id, payload);
        toast.success('Quote updated');
      } else {
        await quoteApi.create(payload);
        toast.success('Quote created');
      }
      setModalOpen(false);
      await loadQuotes();
    } finally {
      setSaving(false);
    }
  };

  const submitConfirm = async () => {
    if (!confirmTarget) return;
    if (!apptForm.appointmentDate) { toast.error('Please select an appointment date'); return; }
    setConfirming(true);
    try {
      await quoteApi.accept(confirmTarget._id, apptForm);
      toast.success('Quote confirmed — customer, vehicle & appointment created', { duration: 5000 });
      setConfirmTarget(null);
      await loadQuotes();
    } finally { setConfirming(false); }
  };

  const handleStatus = async (row, status) => {
    await quoteApi.changeStatus(row._id, status);
    toast.success(`Quote marked ${status}`);
    await loadQuotes();
  };

  // Dropdown pick: "confirmed" opens the appointment-scheduling modal; others just set status.
  const handleStatusPick = (row, value) => {
    if (value === 'confirmed') { setApptForm({ appointmentDate: '', appointmentTime: '' }); setConfirmTarget(row); }
    else handleStatus(row, value);
  };

  const handleDownloadPdf = async (row) => {
    setDownloadingId(row._id);
    try { await quoteApi.downloadPdf(row._id, row.quoteNumber); }
    catch { toast.error('Could not download quote PDF'); }
    finally { setDownloadingId(null); }
  };

  // Build a WhatsApp text summary and open wa.me with the customer's number.
  const sendWhatsApp = (row) => {
    const phone = String(row.phone || '').replace(/\D/g, '');
    const wa = phone.length === 10 ? `91${phone}` : phone; // assume India if 10 digits
    const lines = [
      `*Quotation ${row.quoteNumber || ''}*`,
      row.customerName ? `Customer: ${row.customerName}` : '',
      row.vehicleDetails ? `Vehicle: ${row.vehicleDetails}` : '',
      '',
      ...(row.lineItems || []).map((li) => `• ${li.itemName} x${li.quantity ?? 1} — ${inr((li.quantity ?? 1) * (li.unitPrice || 0))}`),
      '',
      `*Total: ${inr(row.totalAmount)}*`,
      '',
      `Thank you for choosing us!`,
    ].filter((l) => l !== undefined);
    const text = encodeURIComponent(lines.join('\n'));
    const url = wa ? `https://wa.me/${wa}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await quoteApi.remove(confirm._id);
      toast.success('Quote deleted');
      await loadQuotes();
    } finally {
      setConfirm(null);
    }
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    { key: 'quoteNumber', label: 'Quote #' },
    { key: 'customerName', label: 'Customer' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'createdAt',
      label: 'Date & Time',
      render: (row) => {
        const d = row.createdAt ? new Date(row.createdAt) : null;
        if (!d || Number.isNaN(d.getTime())) return '—';
        return (
          <div className="leading-tight">
            <div className="text-slate-700">{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div className="text-xs text-slate-400">{d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Total',
      className: 'text-right',
      render: (row) => inr(row.totalAmount),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); setViewQuote(row); }}>View</Button>
          <StatusMenu row={row} onPick={handleStatusPick} />
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setConfirm(row); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quotes"
        actions={
          <Button variant="primary" onClick={openCreate}>
            + Create Quote
          </Button>
        }
      />

      <Card>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            placeholder="Quote # / customer / phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </Select>
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          {_buControls}
        </div>
        {(search || dateFrom || dateTo || statusFilter) && (
          <div className="mt-2">
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter(''); }}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      <Card padded={false}>
        <DataTable
          columns={columns}
          rows={pagedRows}
          loading={loading}
          emptyMessage="No quotes found."
          rowKey="_id"
          onRowClick={(row) => navigate(`/quotes/${row._id}`)}
        />
        <div className="px-4 pb-3">
          <Pagination page={page} pageSize={PAGE_SIZE} total={_buFiltered.length} onPageChange={setPage} />
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Quote' : 'Add Quote'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div>
              <CustomerSelect
                label="Existing Customer (optional)"
                value={pickedCustomerId}
                onChange={(id, cust) => {
                  setPickedCustomerId(id);
                  if (cust) {
                    setField('customerName', cust.name || '');
                    setField('phone', cust.phone || '');
                  }
                }}
              />
              <p className="mt-1 text-xs text-slate-400">Pick an existing customer to auto-fill, or just type a new walk-in below.</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              value={form.customerName}
              onChange={(e) => setField('customerName', e.target.value)}
              required
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              required
            />
          </div>

          <Input
            label="Vehicle Details"
            value={form.vehicleDetails}
            onChange={(e) => setField('vehicleDetails', e.target.value)}
            placeholder="Make / Model / Reg No."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Discount Type"
              value={form.discountType}
              onChange={(e) => setField('discountType', e.target.value)}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (₹)</option>
            </Select>
            <Input
              label="Discount Value"
              type="number"
              min="0"
              step="0.01"
              value={form.discountValue}
              onChange={(e) => setField('discountValue', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tax Type"
              value={form.taxType}
              onChange={(e) => setField('taxType', e.target.value)}
            >
              <option value="GST">GST</option>
              <option value="Non-GST">Non-GST</option>
            </Select>
            <Input
              label="GST Percentage"
              type="number"
              min="0"
              step="0.01"
              value={form.gstPercentage}
              onChange={(e) => setField('gstPercentage', e.target.value)}
              disabled={form.taxType !== 'GST'}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Line Items
              </label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addLineItem}
              >
                + Add Row
              </Button>
            </div>

            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                <div className="col-span-4">Item</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Tax %</div>
                <div className="col-span-1 text-right">Amount</div>
                <div className="col-span-1" />
              </div>

              {form.lineItems.map((li, idx) => {
                const lineAmount =
                  num(li.quantity) * num(li.unitPrice) +
                  (num(li.quantity) *
                    num(li.unitPrice) *
                    num(li.taxPercentage)) /
                    100;
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-end"
                  >
                    <div className="col-span-12 md:col-span-4 space-y-1">
                      <select
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                        value={li.catalogKey || ''}
                        onChange={(e) => applyCatalogChoice(idx, e.target.value)}
                      >
                        <option value="">Select item…</option>
                        <option value="custom">✎ Custom item</option>
                        {services.length > 0 && (
                          <optgroup label="Services">
                            {services.map((s) => (
                              <option key={s._id} value={`service:${s._id}`}>
                                {s.serviceName} — ₹{s.basePrice ?? 0}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {products.length > 0 && (
                          <optgroup label="Products">
                            {products.map((p) => (
                              <option key={p._id} value={`product:${p._id}`}>
                                {p.productName} — ₹{p.sellingPrice ?? 0}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      {li.catalogKey === 'custom' && (
                        <Input
                          value={li.itemName}
                          placeholder="Custom item name"
                          onChange={(e) => setLineItem(idx, 'itemName', e.target.value)}
                          required
                        />
                      )}
                      {li.catalogKey && li.catalogKey !== 'custom' && (
                        <p className="truncate px-1 text-xs text-slate-400">{li.itemName}</p>
                      )}
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={li.quantity}
                        onChange={(e) =>
                          setLineItem(idx, 'quantity', e.target.value)
                        }
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={li.unitPrice}
                        onChange={(e) =>
                          setLineItem(idx, 'unitPrice', e.target.value)
                        }
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={li.taxPercentage}
                        onChange={(e) =>
                          setLineItem(idx, 'taxPercentage', e.target.value)
                        }
                      />
                    </div>
                    <div className="col-span-8 md:col-span-1 text-right text-sm text-gray-700 pb-2">
                      {inr(lineAmount)}
                    </div>
                    <div className="col-span-4 md:col-span-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => removeLineItem(idx)}
                        disabled={form.lineItems.length === 1}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {terms.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-600">
                Apply Terms Templates <span className="text-xs text-slate-400">(tick to add their text below)</span>
              </p>
              <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                {terms.map((t) => {
                  const on = selectedTerms.includes(t._id);
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => toggleTerm(t._id)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                        on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {on ? '✓ ' : '+ '}{t.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Textarea
            label="Terms & Conditions"
            rows={4}
            value={form.termsAndConditions}
            onChange={(e) => setField('termsAndConditions', e.target.value)}
            placeholder={terms.length ? 'Tick templates above, or type custom terms…' : 'Type terms, or add templates in Administration → Terms & Conditions'}
          />

          <div className="rounded-md bg-gray-50 p-3 text-sm space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{inr(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>- {inr(totals.discount)}</span>
            </div>
            {totals.lineTax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Line Item Tax</span>
                <span>{inr(totals.lineTax)}</span>
              </div>
            )}
            {form.taxType === 'GST' && (
              <div className="flex justify-between text-gray-600">
                <span>GST ({num(form.gstPercentage)}%)</span>
                <span>{inr(totals.gst)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span>
              <span>{inr(totals.total)}</span>
            </div>
          </div>
        </form>
      </Modal>

      {/* View Quote modal — shows the actual formatted PDF, with Download + WhatsApp */}
      <Modal
        open={!!viewQuote}
        onClose={() => setViewQuote(null)}
        title={viewQuote ? `Quotation ${viewQuote.quoteNumber || ''}` : 'Quotation'}
        size="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">Total: {inr(viewQuote?.totalAmount)}</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setViewQuote(null)}>Close</Button>
              <Button variant="secondary" disabled={downloadingId === viewQuote?._id} onClick={() => handleDownloadPdf(viewQuote)}>
                {downloadingId === viewQuote?._id ? 'Downloading…' : '⬇ Download PDF'}
              </Button>
              <Button variant="success" onClick={() => sendWhatsApp(viewQuote)}>WhatsApp</Button>
            </div>
          </div>
        }
      >
        {viewQuote && (
          <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {pdfLoading || !pdfUrl ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                {pdfLoading ? 'Generating quotation…' : 'Preview unavailable — use Download.'}
              </div>
            ) : (
              <iframe title="Quotation PDF" src={pdfUrl} className="h-full w-full" />
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete Quote"
        message={`Delete quote ${confirm?.quoteNumber || ''}? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />

      {/* Confirm quote -> schedule appointment */}
      <Modal
        open={!!confirmTarget}
        onClose={() => !confirming && setConfirmTarget(null)}
        title="Confirm Quote & Schedule Appointment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmTarget(null)} disabled={confirming}>Cancel</Button>
            <Button variant="success" onClick={submitConfirm} disabled={confirming}>{confirming ? 'Confirming…' : 'Confirm & Convert'}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Confirming <b>{confirmTarget?.quoteNumber}</b> creates the Customer, Vehicle and an Appointment. Set the appointment date &amp; time:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Appointment Date" type="date" value={apptForm.appointmentDate} onChange={(e) => setApptForm((f) => ({ ...f, appointmentDate: e.target.value }))} required />
            <Input label="Appointment Time" type="time" value={apptForm.appointmentTime} onChange={(e) => setApptForm((f) => ({ ...f, appointmentTime: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

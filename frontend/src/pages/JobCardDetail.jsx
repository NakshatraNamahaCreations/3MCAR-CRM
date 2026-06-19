import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import jobCardApi from '../api/jobCardApi.js';
import employeeApi from '../api/employeeApi.js';
import productApi from '../api/productApi.js';
import invoiceApi from '../api/invoiceApi.js';
import paymentApi from '../api/paymentApi.js';
import {
  Button, Card, PageHeader, Input, Select, Textarea, StatusBadge, Loading, Modal, ConfirmDialog,
} from '../components/common/ui.jsx';
import { prettyDate } from '../utils/dateUtils.js';

const inr = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PAYMENT_MODES = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];
const labelize = (v) => String(v || '').split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
const idOf = (v) => v?._id || v || '';

const Section = ({ title, action, children }) => (
  <Card>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      {action}
    </div>
    {children}
  </Card>
);

const Info = ({ label, value }) => (
  <div><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-0.5 text-sm font-medium text-slate-800">{value || '—'}</p></div>
);

export default function JobCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [jc, setJc] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // modals
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ assignedTechnicianId: '', serviceAdvisorId: '' });
  const [prodOpen, setProdOpen] = useState(false);
  const [prodForm, setProdForm] = useState({ productId: '', quantity: 1 });
  const [ppfOpen, setPpfOpen] = useState(false);
  const [ppfForm, setPpfForm] = useState({ ppfProductId: '', usedSqft: '', wastageSqft: '', usageArea: '' });
  const [chargesOpen, setChargesOpen] = useState(false);
  const [chargesForm, setChargesForm] = useState({ labourCharges: 0, additionalCharges: [] });
  const [payForm, setPayForm] = useState({ amount: '', paymentMode: 'cash', transactionId: '', remarks: '' });
  const [deliverConfirm, setDeliverConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const card = await jobCardApi.get(id);
      setJc(card);
      setChargesForm({ labourCharges: card.labourCharges || 0, additionalCharges: card.additionalCharges || [] });
      const invs = await invoiceApi.byJobCard(id).catch(() => []);
      const inv = Array.isArray(invs) ? invs[0] : invs;
      setInvoice(inv || null);
      if (inv?._id) setPayments(await paymentApi.byInvoice(inv._id).catch(() => []));
      else setPayments([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => {
    employeeApi.list({ status: 'active' }).then((d) => setEmployees(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
    productApi.list({ status: 'active' }).then((d) => setProducts(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
  }, []);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) toast.success(okMsg); await load(); }
    finally { setBusy(false); }
  };

  const ppfProducts = useMemo(() => products.filter((p) => p.isPPF), [products]);

  /* ---- estimate (before invoice) ---- */
  const estimate = useMemo(() => {
    if (!jc) return 0;
    const s = (jc.selectedServices || []).reduce((t, x) => t + (x.price || 0), 0);
    const p = (jc.productUsage || []).reduce((t, x) => t + (x.total || 0), 0);
    const pf = (jc.ppfUsage || []).reduce((t, x) => t + (x.total || 0), 0);
    const a = (jc.additionalCharges || []).reduce((t, x) => t + (x.amount || 0), 0);
    return s + p + pf + (jc.labourCharges || 0) + a;
  }, [jc]);

  if (loading) return <div><PageHeader title="Job Card" /><Loading /></div>;
  if (!jc) return <div><PageHeader title="Job Card" /><Card>Job card not found.</Card></div>;

  const status = jc.status;
  const inProgress = ['created', 'assigned', 'work_started'].includes(status);
  const technician = employees.find((e) => e._id === idOf(jc.assignedTechnicianId));
  const advisor = employees.find((e) => e._id === idOf(jc.serviceAdvisorId));

  /* ---- actions ---- */
  const submitAssign = () => {
    if (!assignForm.assignedTechnicianId) { toast.error('Select a technician'); return; }
    run(() => jobCardApi.assignTechnician(id, assignForm), 'Technician assigned').then(() => setAssignOpen(false));
  };
  const submitProduct = () => {
    if (!prodForm.productId) { toast.error('Select a product'); return; }
    run(() => jobCardApi.addProductUsage(id, { productId: prodForm.productId, quantity: Number(prodForm.quantity) || 1 }), 'Product added')
      .then(() => { setProdOpen(false); setProdForm({ productId: '', quantity: 1 }); });
  };
  const submitPpf = () => {
    if (!ppfForm.ppfProductId) { toast.error('Select a PPF product'); return; }
    const prod = products.find((p) => p._id === ppfForm.ppfProductId);
    const used = Number(ppfForm.usedSqft) || 0;
    const total = used * (prod?.sellingPrice || 0);
    run(() => jobCardApi.addPPFUsage(id, {
      ppfProductId: ppfForm.ppfProductId,
      usedSqft: used,
      wastageSqft: Number(ppfForm.wastageSqft) || 0,
      usageArea: ppfForm.usageArea,
      total,
    }), 'PPF usage added').then(() => { setPpfOpen(false); setPpfForm({ ppfProductId: '', usedSqft: '', wastageSqft: '', usageArea: '' }); });
  };
  const saveCharges = () => {
    run(() => jobCardApi.update(id, {
      labourCharges: Number(chargesForm.labourCharges) || 0,
      additionalCharges: chargesForm.additionalCharges.map((c) => ({ label: c.label, amount: Number(c.amount) || 0 })),
    }), 'Charges updated').then(() => setChargesOpen(false));
  };
  const addPayment = () => {
    const amt = Number(payForm.amount) || 0;
    if (amt <= 0) { toast.error('Enter a valid amount'); return; }
    run(() => paymentApi.create({
      invoiceId: invoice._id, jobCardId: id, customerId: idOf(jc.customerId),
      amount: amt, paymentMode: payForm.paymentMode, transactionId: payForm.transactionId, remarks: payForm.remarks,
    }), 'Payment recorded').then(() => setPayForm({ amount: '', paymentMode: 'cash', transactionId: '', remarks: '' }));
  };

  const cust = jc.customerId || {};
  const veh = jc.vehicleId || {};
  const balance = invoice ? invoice.balanceAmount : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/job-cards" className="hover:text-slate-600">Job Cards</Link>
        <span>/</span><span className="text-slate-600">{jc.jobCardNumber}</span>
      </div>

      <PageHeader
        title={jc.jobCardNumber}
        subtitle={`${cust.name || ''}${veh.vehicleNumber ? ' · ' + veh.vehicleNumber : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/job-cards')}>← Back</Button>
            <StatusBadge status={status} />
          </div>
        }
      />

      {/* Workflow action bar */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {inProgress && <Button variant="secondary" disabled={busy} onClick={() => { setAssignForm({ assignedTechnicianId: idOf(jc.assignedTechnicianId), serviceAdvisorId: idOf(jc.serviceAdvisorId) }); setAssignOpen(true); }}>Assign Technician</Button>}
          {(status === 'assigned' || (status === 'created' && technician)) && <Button variant="primary" disabled={busy} onClick={() => run(() => jobCardApi.startWork(id), 'Work started')}>Start Work</Button>}
          {status === 'work_started' && (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => setProdOpen(true)}>+ Product</Button>
              <Button variant="secondary" disabled={busy} onClick={() => setPpfOpen(true)}>+ PPF</Button>
              <Button variant="secondary" disabled={busy} onClick={() => setChargesOpen(true)}>Charges</Button>
              <Button variant="success" disabled={busy} onClick={() => run(() => jobCardApi.complete(id), 'Work completed — stock deducted')}>Complete Work</Button>
            </>
          )}
          {status === 'work_completed' && <Button variant="success" disabled={busy} onClick={() => run(() => jobCardApi.generateInvoice(id), 'Invoice generated')}>Generate Invoice</Button>}
          {status === 'paid' && <Button variant="success" disabled={busy} onClick={() => setDeliverConfirm(true)}>Mark Delivered</Button>}
          {status === 'delivered' && <span className="text-sm font-medium text-emerald-600">✓ Delivered</span>}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Customer & vehicle */}
        <Section title="Customer & Vehicle">
          <div className="grid grid-cols-2 gap-4">
            <Info label="Customer" value={cust.name} />
            <Info label="Phone" value={cust.phone} />
            <Info label="Vehicle" value={veh.vehicleNumber} />
            <Info label="Vehicle Model" value={[veh.brand, veh.model].filter(Boolean).join(' ')} />
            <Info label="Address" value={[cust.address, cust.city].filter(Boolean).join(', ')} />
          </div>
        </Section>

        {/* Work / assignment */}
        <Section title="Work & Assignment">
          <div className="grid grid-cols-2 gap-4">
            <Info label="Technician" value={technician?.name} />
            <Info label="Service Advisor" value={advisor?.name} />
            <Info label="Started" value={jc.startTime ? prettyDate(jc.startTime) : '—'} />
            <Info label="Completed" value={jc.completedTime ? prettyDate(jc.completedTime) : '—'} />
            <Info label="Stock Deducted" value={jc.stockDeducted ? 'Yes' : 'No'} />
            <Info label="Created" value={prettyDate(jc.createdAt)} />
          </div>
        </Section>
      </div>

      {/* Items */}
      <Section title="Items & Charges" action={status === 'work_started' && <Button size="sm" variant="secondary" onClick={() => setChargesOpen(true)}>Edit Charges</Button>}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(jc.selectedServices || []).map((s, i) => <tr key={'s' + i}><td className="px-3 py-2">{s.serviceName}</td><td className="px-3 py-2 text-slate-400">Service</td><td className="px-3 py-2 text-right">1</td><td className="px-3 py-2 text-right">{inr(s.price)}</td></tr>)}
              {(jc.productUsage || []).map((p, i) => <tr key={'p' + i}><td className="px-3 py-2">{p.productName}</td><td className="px-3 py-2 text-slate-400">Product{p.deducted ? ' ·deducted' : ''}</td><td className="px-3 py-2 text-right">{p.quantity}</td><td className="px-3 py-2 text-right">{inr(p.total)}</td></tr>)}
              {(jc.ppfUsage || []).map((p, i) => <tr key={'f' + i}><td className="px-3 py-2">PPF {p.usedSqft} sqft</td><td className="px-3 py-2 text-slate-400">PPF</td><td className="px-3 py-2 text-right">{p.usedSqft}</td><td className="px-3 py-2 text-right">{inr(p.total)}</td></tr>)}
              {jc.labourCharges > 0 && <tr><td className="px-3 py-2">Labour</td><td className="px-3 py-2 text-slate-400">Labour</td><td className="px-3 py-2 text-right">1</td><td className="px-3 py-2 text-right">{inr(jc.labourCharges)}</td></tr>}
              {(jc.additionalCharges || []).map((a, i) => <tr key={'a' + i}><td className="px-3 py-2">{a.label}</td><td className="px-3 py-2 text-slate-400">Additional</td><td className="px-3 py-2 text-right">1</td><td className="px-3 py-2 text-right">{inr(a.amount)}</td></tr>)}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-bold text-slate-900">
                <td className="px-3 py-2" colSpan={3}>{invoice ? 'Invoice Total' : 'Estimated Total'}</td>
                <td className="px-3 py-2 text-right">{inr(invoice ? invoice.grandTotal : estimate)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      {/* Invoice & Payments */}
      {invoice && (
        <Section
          title={`Invoice ${invoice.invoiceNumber}`}
          action={
            <div className="flex gap-2">
              <StatusBadge status={invoice.paymentStatus} />
              <Button size="sm" variant="secondary" onClick={() => invoiceApi.downloadPdf(invoice._id, invoice.invoiceNumber)}>⬇ PDF</Button>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Info label="Grand Total" value={inr(invoice.grandTotal)} />
            <Info label="Paid" value={inr(invoice.paidAmount)} />
            <Info label="Balance Due" value={inr(invoice.balanceAmount)} />
            <Info label="GST" value={inr(invoice.gstAmount)} />
          </div>

          {/* Payments list */}
          {payments.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Payments</p>
              <div className="space-y-1">
                {payments.map((p) => (
                  <div key={p._id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{inr(p.amount)} <span className="text-slate-400">· {labelize(p.paymentMode)}</span></span>
                    <span className="text-xs text-slate-400">{prettyDate(p.paymentDate || p.createdAt)}{p.transactionId ? ` · ${p.transactionId}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add payment (split — add one mode at a time) */}
          {invoice.paymentStatus !== 'paid' && invoice.invoiceStatus !== 'cancelled' && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-sm font-medium text-slate-600">Collect Payment <span className="text-xs text-slate-400">(add each mode separately for split payments)</span></p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <Input type="number" placeholder={`Amount (bal ${inr(balance)})`} value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
                <Select value={payForm.paymentMode} onChange={(e) => setPayForm((f) => ({ ...f, paymentMode: e.target.value }))}>
                  {PAYMENT_MODES.map((m) => <option key={m} value={m}>{labelize(m)}</option>)}
                </Select>
                <Input placeholder="Txn / Ref ID" value={payForm.transactionId} onChange={(e) => setPayForm((f) => ({ ...f, transactionId: e.target.value }))} />
                <Button variant="success" disabled={busy} onClick={addPayment}>Add Payment</Button>
              </div>
            </div>
          )}
          {invoice.paymentStatus === 'paid' && (
            <p className="mt-3 text-sm font-medium text-emerald-600">✓ Fully paid{status !== 'delivered' ? ' — ready to deliver' : ''}.</p>
          )}
        </Section>
      )}

      {/* ---- Modals ---- */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Technician"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button><Button variant="primary" onClick={submitAssign} disabled={busy}>Assign</Button></div>}>
        <div className="space-y-3">
          <Select label="Technician" value={assignForm.assignedTechnicianId} onChange={(e) => setAssignForm((f) => ({ ...f, assignedTechnicianId: e.target.value }))}>
            <option value="">Select technician…</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.name} ({labelize(e.role)})</option>)}
          </Select>
          <Select label="Service Advisor" value={assignForm.serviceAdvisorId} onChange={(e) => setAssignForm((f) => ({ ...f, serviceAdvisorId: e.target.value }))}>
            <option value="">Select advisor…</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.name} ({labelize(e.role)})</option>)}
          </Select>
        </div>
      </Modal>

      <Modal open={prodOpen} onClose={() => setProdOpen(false)} title="Add Product Usage"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setProdOpen(false)}>Cancel</Button><Button variant="primary" onClick={submitProduct} disabled={busy}>Add</Button></div>}>
        <div className="space-y-3">
          <Select label="Product" value={prodForm.productId} onChange={(e) => setProdForm((f) => ({ ...f, productId: e.target.value }))}>
            <option value="">Select product…</option>
            {products.filter((p) => !p.isPPF).map((p) => <option key={p._id} value={p._id}>{p.productName} — ₹{p.sellingPrice} (stock {p.currentStock})</option>)}
          </Select>
          <Input label="Quantity" type="number" min="1" value={prodForm.quantity} onChange={(e) => setProdForm((f) => ({ ...f, quantity: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={ppfOpen} onClose={() => setPpfOpen(false)} title="Add PPF Usage"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPpfOpen(false)}>Cancel</Button><Button variant="primary" onClick={submitPpf} disabled={busy}>Add</Button></div>}>
        <div className="space-y-3">
          <Select label="PPF Product" value={ppfForm.ppfProductId} onChange={(e) => setPpfForm((f) => ({ ...f, ppfProductId: e.target.value }))}>
            <option value="">Select PPF film…</option>
            {ppfProducts.map((p) => <option key={p._id} value={p._id}>{p.productName} — ₹{p.sellingPrice}/sqft (stock {p.currentStock})</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Used (sqft)" type="number" value={ppfForm.usedSqft} onChange={(e) => setPpfForm((f) => ({ ...f, usedSqft: e.target.value }))} />
            <Input label="Wastage (sqft)" type="number" value={ppfForm.wastageSqft} onChange={(e) => setPpfForm((f) => ({ ...f, wastageSqft: e.target.value }))} />
          </div>
          <Input label="Usage Area" value={ppfForm.usageArea} onChange={(e) => setPpfForm((f) => ({ ...f, usageArea: e.target.value }))} placeholder="e.g. Full car / Bonnet" />
        </div>
      </Modal>

      <Modal open={chargesOpen} onClose={() => setChargesOpen(false)} title="Labour & Additional Charges"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setChargesOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveCharges} disabled={busy}>Save</Button></div>}>
        <div className="space-y-3">
          <Input label="Labour Charges" type="number" value={chargesForm.labourCharges} onChange={(e) => setChargesForm((f) => ({ ...f, labourCharges: e.target.value }))} />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Additional Charges</span>
              <Button size="sm" variant="secondary" type="button" onClick={() => setChargesForm((f) => ({ ...f, additionalCharges: [...f.additionalCharges, { label: '', amount: 0 }] }))}>+ Add</Button>
            </div>
            <div className="space-y-2">
              {chargesForm.additionalCharges.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" placeholder="Label" value={c.label} onChange={(e) => setChargesForm((f) => ({ ...f, additionalCharges: f.additionalCharges.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) }))} />
                  <input className="w-28 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" type="number" placeholder="Amount" value={c.amount} onChange={(e) => setChargesForm((f) => ({ ...f, additionalCharges: f.additionalCharges.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x) }))} />
                  <button type="button" className="text-slate-400 hover:text-red-500" onClick={() => setChargesForm((f) => ({ ...f, additionalCharges: f.additionalCharges.filter((_, idx) => idx !== i) }))}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deliverConfirm}
        title="Mark Delivered"
        message="Confirm the vehicle has been delivered to the customer? (Invoice is fully paid.)"
        onConfirm={() => { setDeliverConfirm(false); run(() => jobCardApi.markDelivered(id), 'Vehicle delivered'); }}
        onCancel={() => setDeliverConfirm(false)}
      />
    </div>
  );
}

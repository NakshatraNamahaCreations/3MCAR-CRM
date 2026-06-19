import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { enquiryApi } from '../api/enquiryApi.js';
import { enquiryFollowupApi } from '../api/enquiryFollowupApi.js';
import { quoteApi } from '../api/quoteApi.js';
import serviceApi from '../api/serviceApi.js';
import productApi from '../api/productApi.js';
import termsApi from '../api/termsApi.js';
import {
  Button, Card, PageHeader, Input, Select, Textarea, StatusBadge, Loading, Modal, ConfirmDialog,
} from '../components/common/ui.jsx';
import { vehicleTypeLabel } from '../constants/vehicleTypes.js';
import { prettyDate } from '../utils/dateUtils.js';

const FOLLOWUP_STATUS = ['pending', 'call_later', 'confirmed', 'not_interested'];
const labelize = (v) =>
  String(v || '').split(/[-_]/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
const inr = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SectionTitle = ({ children, action }) => (
  <div className="mb-3 flex items-center justify-between">
    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{children}</h3>
    {action}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium text-slate-400">{label}</p>
    <p className="mt-0.5 text-sm font-medium text-slate-800">{value || '—'}</p>
  </div>
);

export default function EnquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [enquiry, setEnquiry] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // followup modal
  const [fuOpen, setFuOpen] = useState(false);
  const [fuForm, setFuForm] = useState({ followupDate: '', followupTime: '', status: 'pending', remarks: '' });
  const [fuSaving, setFuSaving] = useState(false);
  const [fuDelete, setFuDelete] = useState(null);

  // quote modal
  const [qOpen, setQOpen] = useState(false);
  const [qSaving, setQSaving] = useState(false);
  const [qForm, setQForm] = useState({
    taxType: 'GST', gstPercentage: 18, discountType: 'percentage', discountValue: 0,
    termsAndConditions: '', lineItems: [{ catalogKey: '', serviceId: null, productId: null, itemName: '', quantity: 1, unitPrice: 0, taxPercentage: 18 }],
  });

  // catalog for the line-item picker + terms templates
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedTerms, setSelectedTerms] = useState([]);

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
      } catch { /* non-fatal — custom items still work */ }
    })();
  }, []);

  const combineTerms = (ids) =>
    terms.filter((t) => ids.includes(t._id)).map((t) => t.content).join('\n\n');
  const toggleTerm = (tid) => {
    setSelectedTerms((prev) => {
      const next = prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid];
      setQForm((f) => ({ ...f, termsAndConditions: combineTerms(next) }));
      return next;
    });
  };
  const applyCatalogChoice = (i, catalogKey) => {
    if (catalogKey === 'custom' || !catalogKey) {
      setLineFull(i, { catalogKey: 'custom', serviceId: null, productId: null });
      return;
    }
    const [kind, cid] = catalogKey.split(':');
    let patch = { catalogKey, serviceId: null, productId: null };
    if (kind === 'service') {
      const s = services.find((x) => x._id === cid);
      if (s) patch = { ...patch, serviceId: cid, itemName: s.serviceName, unitPrice: s.basePrice ?? 0, taxPercentage: qForm.taxType === 'Non-GST' ? 0 : (s.gstPercentage ?? qForm.gstPercentage) };
    } else if (kind === 'product') {
      const p = products.find((x) => x._id === cid);
      if (p) patch = { ...patch, productId: cid, itemName: p.productName, unitPrice: p.sellingPrice ?? 0, taxPercentage: qForm.taxType === 'Non-GST' ? 0 : (p.gstPercentage ?? qForm.gstPercentage) };
    }
    setLineFull(i, patch);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [enq, fus, qs] = await Promise.all([
        enquiryApi.get(id),
        enquiryFollowupApi.byEnquiry(id).catch(() => []),
        quoteApi.byEnquiry(id).catch(() => []),
      ]);
      setEnquiry(enq);
      setFollowups(Array.isArray(fus) ? fus : []);
      setQuotes(Array.isArray(qs) ? qs : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [id]);

  /* ---------------- Followups ---------------- */
  const submitFollowup = async (e) => {
    e.preventDefault();
    if (!fuForm.followupDate) { toast.error('Followup date is required'); return; }
    setFuSaving(true);
    try {
      await enquiryFollowupApi.create({ enquiryId: id, ...fuForm });
      toast.success('Followup added');
      setFuOpen(false);
      setFuForm({ followupDate: '', followupTime: '', status: 'pending', remarks: '' });
      const fus = await enquiryFollowupApi.byEnquiry(id);
      setFollowups(Array.isArray(fus) ? fus : []);
    } finally { setFuSaving(false); }
  };

  const deleteFollowup = async () => {
    if (!fuDelete) return;
    try {
      await enquiryFollowupApi.remove(fuDelete._id);
      toast.success('Followup deleted');
      setFollowups((list) => list.filter((f) => f._id !== fuDelete._id));
    } finally { setFuDelete(null); }
  };

  /* ---------------- Quote builder ---------------- */
  const setLine = (i, key, val) =>
    setQForm((f) => ({ ...f, lineItems: f.lineItems.map((li, idx) => (idx === i ? { ...li, [key]: val } : li)) }));
  const setLineFull = (i, patch) =>
    setQForm((f) => ({ ...f, lineItems: f.lineItems.map((li, idx) => (idx === i ? { ...li, ...patch } : li)) }));
  const addLine = () =>
    setQForm((f) => ({ ...f, lineItems: [...f.lineItems, { catalogKey: '', serviceId: null, productId: null, itemName: '', quantity: 1, unitPrice: 0, taxPercentage: f.taxType === 'Non-GST' ? 0 : f.gstPercentage }] }));
  const removeLine = (i) =>
    setQForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) }));

  const quoteTotals = useMemo(() => {
    const items = qForm.lineItems;
    const subtotal = items.reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0);
    let discount = qForm.discountType === 'percentage' ? (subtotal * (Number(qForm.discountValue) || 0)) / 100 : Number(qForm.discountValue) || 0;
    discount = Math.min(discount, subtotal);
    const taxable = subtotal - discount;
    const gst = qForm.taxType === 'Non-GST' ? 0 : items.reduce((s, li) => {
      const line = (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0);
      const share = subtotal > 0 ? (line * (taxable / subtotal)) : 0;
      return s + (share * (Number(li.taxPercentage) || 0)) / 100;
    }, 0);
    return { subtotal, discount, taxable, gst, total: taxable + gst };
  }, [qForm]);

  const openQuote = () => {
    const defaults = terms.filter((t) => t.isDefault).map((t) => t._id);
    setSelectedTerms(defaults);
    setQForm((f) => ({ ...f, termsAndConditions: combineTerms(defaults) }));
    setQOpen(true);
  };

  const submitQuote = async (e) => {
    e.preventDefault();
    const valid = qForm.lineItems.filter((li) => li.itemName.trim());
    if (!valid.length) { toast.error('Add at least one line item'); return; }
    setQSaving(true);
    try {
      await quoteApi.createFromEnquiry({
        enquiryId: id,
        taxType: qForm.taxType,
        gstPercentage: Number(qForm.gstPercentage) || 0,
        discountType: qForm.discountType,
        discountValue: Number(qForm.discountValue) || 0,
        termsAndConditions: qForm.termsAndConditions,
        lineItems: valid.map((li) => ({
          itemName: li.itemName,
          serviceId: li.serviceId || undefined,
          productId: li.productId || undefined,
          quantity: Number(li.quantity) || 1,
          unitPrice: Number(li.unitPrice) || 0,
          taxPercentage: qForm.taxType === 'Non-GST' ? 0 : Number(li.taxPercentage) || 0,
        })),
      });
      toast.success('Quote created');
      setQOpen(false);
      setSelectedTerms([]);
      setQForm((f) => ({ ...f, lineItems: [{ catalogKey: '', serviceId: null, productId: null, itemName: '', quantity: 1, unitPrice: 0, taxPercentage: 18 }], discountValue: 0, termsAndConditions: '' }));
      const qs = await quoteApi.byEnquiry(id);
      setQuotes(Array.isArray(qs) ? qs : []);
    } finally { setQSaving(false); }
  };

  const [busyQuote, setBusyQuote] = useState(null); // quoteId currently performing an action
  const [acceptTarget, setAcceptTarget] = useState(null);

  const refreshQuotesAndEnquiry = async () => {
    const [enq, qs] = await Promise.all([
      enquiryApi.get(id).catch(() => enquiry),
      quoteApi.byEnquiry(id).catch(() => quotes),
    ]);
    setEnquiry(enq);
    setQuotes(Array.isArray(qs) ? qs : []);
  };

  const changeQuoteStatus = async (quote, status) => {
    setBusyQuote(quote._id);
    try {
      await quoteApi.changeStatus(quote._id, status);
      toast.success(`Quote ${labelize(status)}`);
      await refreshQuotesAndEnquiry();
    } finally { setBusyQuote(null); }
  };

  const acceptQuote = async () => {
    const quote = acceptTarget;
    if (!quote) return;
    setBusyQuote(quote._id);
    try {
      await quoteApi.accept(quote._id);
      toast.success('Quote confirmed — customer, vehicle & draft appointment created', { duration: 5000 });
      setAcceptTarget(null);
      await refreshQuotesAndEnquiry();
    } finally { setBusyQuote(null); }
  };

  if (loading) return <div><PageHeader title="Enquiry" /><Loading /></div>;
  if (!enquiry) return <div><PageHeader title="Enquiry" /><Card>Enquiry not found.</Card></div>;

  const vehicle = [enquiry.vehicleBrand, enquiry.vehicleModel, enquiry.vehicleYear].filter(Boolean).join(' ');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/enquiries" className="hover:text-slate-600">Enquiries</Link>
        <span>/</span>
        <span className="text-slate-600">{enquiry.name}</span>
      </div>

      <PageHeader
        title={enquiry.name}
        subtitle={`${enquiry.phone || ''}${vehicle ? ' · ' + vehicle : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/enquiries')}>← Back</Button>
            <Button variant="success" onClick={openQuote}>+ Create Quote</Button>
            <Button variant="primary" onClick={() => setFuOpen(true)}>+ Add Followup</Button>
          </div>
        }
      />

      {/* Enquiry info */}
      <Card>
        <SectionTitle action={<StatusBadge status={enquiry.status} />}>Enquiry Details</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <InfoRow label="Phone" value={enquiry.phone} />
          <InfoRow label="Alternate Phone" value={enquiry.alternatePhone} />
          <InfoRow label="Email" value={enquiry.email} />
          <InfoRow label="Source" value={labelize(enquiry.source)} />
          <InfoRow label="Vehicle Number" value={enquiry.vehicleNumber} />
          <InfoRow label="Vehicle" value={vehicle} />
          <InfoRow label="Vehicle Type" value={vehicleTypeLabel(enquiry.vehicleType)} />
          <InfoRow label="Created" value={prettyDate(enquiry.createdAt)} />
          <InfoRow label="Status" value={labelize(enquiry.status)} />
        </div>
        {enquiry.notes && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-400">Notes</p>
            <p className="mt-1 text-sm text-slate-700">{enquiry.notes}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Followups */}
        <Card>
          <SectionTitle action={<Button size="sm" variant="primary" onClick={() => setFuOpen(true)}>+ Add</Button>}>
            Followups ({followups.length})
          </SectionTitle>
          {followups.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No followups yet.</p>
          ) : (
            <div className="space-y-2">
              {followups.map((f) => (
                <div key={f._id} className="flex items-start justify-between rounded-lg border border-slate-100 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">{prettyDate(f.followupDate)}</span>
                      {f.followupTime && <span className="text-xs text-slate-400">{f.followupTime}</span>}
                      <StatusBadge status={f.status} />
                    </div>
                    {f.remarks && <p className="mt-1 text-sm text-slate-500">{f.remarks}</p>}
                  </div>
                  <button onClick={() => setFuDelete(f)} className="text-xs font-medium text-red-500 hover:text-red-700">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quotes */}
        <Card>
          <SectionTitle action={<Button size="sm" variant="success" onClick={openQuote}>+ Create</Button>}>
            Quotes ({quotes.length})
          </SectionTitle>
          {quotes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No quotes yet.</p>
          ) : (
            <div className="space-y-2">
              {quotes.map((q) => {
                const busy = busyQuote === q._id;
                const terminal = ['confirmed', 'rejected'].includes(q.status);
                return (
                  <div key={q._id} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{q.quoteNumber}</p>
                        <p className="text-xs text-slate-400">{prettyDate(q.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-800">{inr(q.totalAmount)}</span>
                        <StatusBadge status={q.status} />
                      </div>
                    </div>
                    {!terminal && (
                      <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-slate-50 pt-2">
                        {q.status === 'draft' && (
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => changeQuoteStatus(q, 'sent')}>
                            Mark Sent
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => changeQuoteStatus(q, 'rejected')}>
                          Reject
                        </Button>
                        <Button size="sm" variant="success" disabled={busy} onClick={() => setAcceptTarget(q)}>
                          {busy ? 'Working…' : 'Confirm'}
                        </Button>
                      </div>
                    )}
                    {q.status === 'confirmed' && (
                      <p className="mt-2 border-t border-slate-50 pt-2 text-xs font-medium text-emerald-600">
                        ✓ Confirmed — customer, vehicle &amp; draft appointment created.{' '}
                        <Link to="/appointments" className="underline hover:text-emerald-700">View appointments</Link>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ---- Add Followup modal ---- */}
      <Modal
        open={fuOpen}
        onClose={() => !fuSaving && setFuOpen(false)}
        title="Add Followup"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFuOpen(false)} disabled={fuSaving}>Cancel</Button>
            <Button variant="primary" onClick={submitFollowup} disabled={fuSaving}>{fuSaving ? 'Saving…' : 'Add Followup'}</Button>
          </div>
        }
      >
        <form onSubmit={submitFollowup} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={fuForm.followupDate} onChange={(e) => setFuForm((f) => ({ ...f, followupDate: e.target.value }))} required />
            <Input label="Time" type="time" value={fuForm.followupTime} onChange={(e) => setFuForm((f) => ({ ...f, followupTime: e.target.value }))} />
          </div>
          <Select label="Status" value={fuForm.status} onChange={(e) => setFuForm((f) => ({ ...f, status: e.target.value }))}>
            {FOLLOWUP_STATUS.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
          </Select>
          <Textarea label="Remarks" rows={3} value={fuForm.remarks} onChange={(e) => setFuForm((f) => ({ ...f, remarks: e.target.value }))} />
        </form>
      </Modal>

      {/* ---- Create Quote modal ---- */}
      <Modal
        open={qOpen}
        onClose={() => !qSaving && setQOpen(false)}
        title={`Create Quote for ${enquiry.name}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">Total: {inr(quoteTotals.total)}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setQOpen(false)} disabled={qSaving}>Cancel</Button>
              <Button variant="success" onClick={submitQuote} disabled={qSaving}>{qSaving ? 'Saving…' : 'Create Quote'}</Button>
            </div>
          </div>
        }
      >
        <form onSubmit={submitQuote} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Select label="Tax Type" value={qForm.taxType} onChange={(e) => setQForm((f) => ({ ...f, taxType: e.target.value }))}>
              <option value="GST">GST</option>
              <option value="Non-GST">Non-GST</option>
            </Select>
            <Input label="GST %" type="number" value={qForm.gstPercentage} onChange={(e) => setQForm((f) => ({ ...f, gstPercentage: e.target.value }))} disabled={qForm.taxType === 'Non-GST'} />
            <Select label="Discount Type" value={qForm.discountType} onChange={(e) => setQForm((f) => ({ ...f, discountType: e.target.value }))}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </Select>
            <Input label="Discount" type="number" value={qForm.discountValue} onChange={(e) => setQForm((f) => ({ ...f, discountValue: e.target.value }))} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Line Items</span>
              <Button size="sm" variant="secondary" type="button" onClick={addLine}>+ Add Item</Button>
            </div>
            <div className="space-y-2">
              {qForm.lineItems.map((li, i) => (
                <div key={i} className="grid grid-cols-12 items-start gap-2">
                  <div className="col-span-5 space-y-1">
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
                      value={li.catalogKey || ''}
                      onChange={(e) => applyCatalogChoice(i, e.target.value)}
                    >
                      <option value="">Select item…</option>
                      <option value="custom">✎ Custom item</option>
                      {services.length > 0 && (
                        <optgroup label="Services">
                          {services.map((s) => <option key={s._id} value={`service:${s._id}`}>{s.serviceName} — ₹{s.basePrice ?? 0}</option>)}
                        </optgroup>
                      )}
                      {products.length > 0 && (
                        <optgroup label="Products">
                          {products.map((p) => <option key={p._id} value={`product:${p._id}`}>{p.productName} — ₹{p.sellingPrice ?? 0}</option>)}
                        </optgroup>
                      )}
                    </select>
                    {li.catalogKey === 'custom' && (
                      <input className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" placeholder="Custom item name" value={li.itemName} onChange={(e) => setLine(i, 'itemName', e.target.value)} />
                    )}
                    {li.catalogKey && li.catalogKey !== 'custom' && (
                      <p className="truncate px-1 text-xs text-slate-400">{li.itemName}</p>
                    )}
                  </div>
                  <input className="col-span-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" type="number" placeholder="Qty" value={li.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
                  <input className="col-span-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" type="number" placeholder="Price" value={li.unitPrice} onChange={(e) => setLine(i, 'unitPrice', e.target.value)} />
                  <input className="col-span-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" type="number" placeholder="Tax%" value={li.taxPercentage} disabled={qForm.taxType === 'Non-GST'} onChange={(e) => setLine(i, 'taxPercentage', e.target.value)} />
                  <button type="button" onClick={() => removeLine(i)} className="col-span-1 pt-1.5 text-lg text-slate-400 hover:text-red-500" disabled={qForm.lineItems.length === 1}>×</button>
                </div>
              ))}
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
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {on ? '✓ ' : '+ '}{t.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{inr(quoteTotals.subtotal)}</span></div>
            {quoteTotals.discount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>- {inr(quoteTotals.discount)}</span></div>}
            {qForm.taxType !== 'Non-GST' && <div className="flex justify-between text-slate-600"><span>GST</span><span>{inr(quoteTotals.gst)}</span></div>}
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900"><span>Total</span><span>{inr(quoteTotals.total)}</span></div>
          </div>

          <Textarea label="Terms & Conditions" rows={2} value={qForm.termsAndConditions} onChange={(e) => setQForm((f) => ({ ...f, termsAndConditions: e.target.value }))} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!fuDelete}
        title="Delete Followup"
        message="Are you sure you want to delete this followup?"
        onConfirm={deleteFollowup}
        onCancel={() => setFuDelete(null)}
      />

      <ConfirmDialog
        open={!!acceptTarget}
        title="Confirm Quote"
        message={`Confirming ${acceptTarget?.quoteNumber || 'this quote'} will mark the enquiry as converted and automatically create the Customer, Vehicle, and a draft Appointment. Continue?`}
        onConfirm={acceptQuote}
        onCancel={() => setAcceptTarget(null)}
      />
    </div>
  );
}

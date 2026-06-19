import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quoteApi } from '../api/quoteApi.js';
import { quoteFollowupApi } from '../api/quoteFollowupApi.js';
import {
  Button, Card, PageHeader, Input, Select, Textarea, StatusBadge, Loading, Modal, ConfirmDialog,
} from '../components/common/ui.jsx';
import { prettyDate } from '../utils/dateUtils.js';

const FOLLOWUP_STATUS = ['pending', 'call_later', 'confirmed', 'not_interested'];
const QUOTE_STATUS_CHOICES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirm (convert to customer)' },
  { value: 'rejected', label: 'Reject' },
];
const labelize = (v) => String(v || '').split(/[-_]/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
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

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [apptForm, setApptForm] = useState({ appointmentDate: '', appointmentTime: '' });

  // inline PDF preview
  const [viewOpen, setViewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  // followup modal
  const [fuOpen, setFuOpen] = useState(false);
  const [fuEditing, setFuEditing] = useState(null);
  const [fuForm, setFuForm] = useState({ followupDate: '', followupTime: '', status: 'pending', remarks: '' });
  const [fuSaving, setFuSaving] = useState(false);
  const [fuDelete, setFuDelete] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [q, fus] = await Promise.all([
        quoteApi.get(id),
        quoteFollowupApi.byQuote(id).catch(() => []),
      ]);
      setQuote(q);
      setFollowups(Array.isArray(fus) ? fus : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [id]);

  const reloadFollowups = async () => {
    const fus = await quoteFollowupApi.byQuote(id).catch(() => []);
    setFollowups(Array.isArray(fus) ? fus : []);
  };

  /* ---- Quote actions ---- */
  const confirmQuote = async () => {
    if (!apptForm.appointmentDate) { toast.error('Please select an appointment date'); return; }
    setBusy(true);
    try {
      await quoteApi.accept(id, apptForm);
      toast.success('Quote confirmed — customer, vehicle & appointment created', { duration: 5000 });
      setConfirmConvert(false);
      await loadAll();
    } finally { setBusy(false); }
  };
  const changeStatus = async (status) => {
    setBusy(true);
    try { await quoteApi.changeStatus(id, status); toast.success(`Quote marked ${status}`); await loadAll(); }
    finally { setBusy(false); }
  };
  // Status dropdown pick: "confirmed" needs confirmation (it converts); others apply directly.
  const pickStatus = (status) => {
    setStatusOpen(false);
    if (status === 'confirmed') { setApptForm({ appointmentDate: '', appointmentTime: '' }); setConfirmConvert(true); }
    else changeStatus(status);
  };
  const downloadPdf = async () => {
    try { await quoteApi.downloadPdf(id, quote?.quoteNumber); }
    catch { toast.error('Could not download PDF'); }
  };

  // Load the formatted PDF into an object URL whenever the preview opens.
  useEffect(() => {
    let revoked = false;
    let currentUrl = '';
    if (viewOpen) {
      setPdfLoading(true);
      setPdfUrl('');
      quoteApi
        .pdfObjectUrl(id)
        .then((url) => {
          if (revoked) { window.URL.revokeObjectURL(url); return; }
          currentUrl = url;
          setPdfUrl(url);
        })
        .catch(() => toast.error('Could not load quote preview'))
        .finally(() => { if (!revoked) setPdfLoading(false); });
    }
    return () => {
      revoked = true;
      if (currentUrl) window.URL.revokeObjectURL(currentUrl);
    };
  }, [viewOpen, id]);
  const sendWhatsApp = () => {
    if (!quote) return;
    const phone = String(quote.phone || '').replace(/\D/g, '');
    const wa = phone.length === 10 ? `91${phone}` : phone;
    const lines = [
      `*Quotation ${quote.quoteNumber || ''}*`,
      quote.customerName ? `Customer: ${quote.customerName}` : '',
      '', ...(quote.lineItems || []).map((li) => `• ${li.itemName} x${li.quantity ?? 1} — ${inr((li.quantity ?? 1) * (li.unitPrice || 0))}`),
      '', `*Total: ${inr(quote.totalAmount)}*`,
    ].filter(Boolean);
    window.open(`${wa ? `https://wa.me/${wa}` : 'https://wa.me/'}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  /* ---- Followups ---- */
  const openFuCreate = () => { setFuEditing(null); setFuForm({ followupDate: '', followupTime: '', status: 'pending', remarks: '' }); setFuOpen(true); };
  const openFuEdit = (f) => {
    setFuEditing(f);
    setFuForm({
      followupDate: f.followupDate ? String(f.followupDate).slice(0, 10) : '',
      followupTime: f.followupTime || '',
      status: f.status || 'pending',
      remarks: f.remarks || '',
    });
    setFuOpen(true);
  };
  const submitFollowup = async (e) => {
    e.preventDefault();
    if (!fuForm.followupDate) { toast.error('Followup date is required'); return; }
    setFuSaving(true);
    try {
      if (fuEditing) { await quoteFollowupApi.update(fuEditing._id, fuForm); toast.success('Followup updated'); }
      else { await quoteFollowupApi.create({ quoteId: id, ...fuForm }); toast.success('Followup added'); }
      setFuOpen(false); setFuEditing(null);
      await reloadFollowups();
    } finally { setFuSaving(false); }
  };
  const deleteFollowup = async () => {
    if (!fuDelete) return;
    try { await quoteFollowupApi.remove(fuDelete._id); toast.success('Followup deleted'); setFollowups((l) => l.filter((f) => f._id !== fuDelete._id)); }
    finally { setFuDelete(null); }
  };

  if (loading) return <div><PageHeader title="Quote" /><Loading /></div>;
  if (!quote) return <div><PageHeader title="Quote" /><Card>Quote not found.</Card></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/quotes" className="hover:text-slate-600">Quotes</Link>
        <span>/</span>
        <span className="text-slate-600">{quote.quoteNumber}</span>
      </div>

      <PageHeader
        title={quote.quoteNumber}
        subtitle={`${quote.customerName || ''}${quote.phone ? ' · ' + quote.phone : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/quotes')}>← Back</Button>
            <Button variant="primary" onClick={() => setViewOpen(true)}>👁 View</Button>
            <Button variant="secondary" onClick={downloadPdf}>⬇ PDF</Button>
            <Button variant="success" onClick={sendWhatsApp}>WhatsApp</Button>
            {/* Status dropdown — Confirm converts to customer. Locked once confirmed. */}
            {quote.status === 'confirmed' ? (
              <Button variant="secondary" disabled title="Confirmed quotes can't change status">Confirmed</Button>
            ) : (
              <div className="relative">
                <Button variant="secondary" disabled={busy} onClick={() => setStatusOpen((o) => !o)}>
                  Status ▾
                </Button>
                {statusOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setStatusOpen(false)} />
                    <div className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {QUOTE_STATUS_CHOICES.filter((c) => c.value !== quote.status).map((c) => (
                        <button
                          key={c.value}
                          onClick={() => pickStatus(c.value)}
                          className="block w-full px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <Button variant="primary" onClick={openFuCreate}>+ Add Followup</Button>
          </div>
        }
      />

      {/* Quote info */}
      <Card>
        <SectionTitle action={<StatusBadge status={quote.status} />}>Quote Details</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <InfoRow label="Customer" value={quote.customerName} />
          <InfoRow label="Phone" value={quote.phone} />
          <InfoRow label="Vehicle" value={quote.vehicleDetails} />
          <InfoRow label="Created" value={prettyDate(quote.createdAt)} />
          <InfoRow label="Tax Type" value={quote.taxType} />
          <InfoRow label="Subtotal" value={inr(quote.subtotal)} />
          <InfoRow label="GST" value={inr(quote.gstAmount)} />
          <InfoRow label="Total" value={inr(quote.totalAmount)} />
        </div>
        {quote.status === 'confirmed' && (
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-emerald-600">
            ✓ Confirmed — customer, vehicle &amp; draft appointment created.{' '}
            <Link to="/appointments" className="underline hover:text-emerald-700">View appointments</Link>
          </p>
        )}
      </Card>

      {/* Line items */}
      <Card>
        <SectionTitle>Line Items</SectionTitle>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Tax%</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(quote.lineItems || []).map((li, i) => {
                const qty = li.quantity ?? 1;
                const amt = li.total != null ? li.total : qty * (li.unitPrice || 0);
                return (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-700">{li.itemName}</td>
                    <td className="px-3 py-2 text-right">{qty}</td>
                    <td className="px-3 py-2 text-right">{inr(li.unitPrice)}</td>
                    <td className="px-3 py-2 text-right">{li.taxPercentage || 0}%</td>
                    <td className="px-3 py-2 text-right font-medium">{inr(amt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Followups */}
      <Card>
        <SectionTitle action={<Button size="sm" variant="primary" onClick={openFuCreate}>+ Add</Button>}>
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
                <div className="flex gap-2">
                  <button onClick={() => openFuEdit(f)} className="text-xs font-medium text-brand-600 hover:text-brand-700">Edit</button>
                  <button onClick={() => setFuDelete(f)} className="text-xs font-medium text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Followup modal */}
      <Modal
        open={fuOpen}
        onClose={() => !fuSaving && setFuOpen(false)}
        title={fuEditing ? 'Edit Followup' : 'Add Followup'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFuOpen(false)} disabled={fuSaving}>Cancel</Button>
            <Button variant="primary" onClick={submitFollowup} disabled={fuSaving}>{fuSaving ? 'Saving…' : fuEditing ? 'Update' : 'Add Followup'}</Button>
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

      <ConfirmDialog
        open={!!fuDelete}
        title="Delete Followup"
        message="Are you sure you want to delete this followup?"
        onConfirm={deleteFollowup}
        onCancel={() => setFuDelete(null)}
      />

      <Modal
        open={confirmConvert}
        onClose={() => !busy && setConfirmConvert(false)}
        title="Confirm Quote & Schedule Appointment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmConvert(false)} disabled={busy}>Cancel</Button>
            <Button variant="success" onClick={confirmQuote} disabled={busy}>{busy ? 'Confirming…' : 'Confirm & Convert'}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Confirming <b>{quote.quoteNumber}</b> creates the Customer, Vehicle and an Appointment. Set the appointment date &amp; time:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Appointment Date"
              type="date"
              value={apptForm.appointmentDate}
              onChange={(e) => setApptForm((f) => ({ ...f, appointmentDate: e.target.value }))}
              required
            />
            <Input
              label="Appointment Time"
              type="time"
              value={apptForm.appointmentTime}
              onChange={(e) => setApptForm((f) => ({ ...f, appointmentTime: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Inline quote preview (formatted PDF) */}
      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title={`Quotation ${quote.quoteNumber || ''}`}
        size="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">Total: {inr(quote.totalAmount ?? quote.grandTotal)}</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setViewOpen(false)}>Close</Button>
              <Button variant="secondary" onClick={downloadPdf}>⬇ Download PDF</Button>
              <Button variant="success" onClick={sendWhatsApp}>WhatsApp</Button>
            </div>
          </div>
        }
      >
        <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          {pdfLoading || !pdfUrl ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              {pdfLoading ? 'Generating quotation…' : 'Preview unavailable — use Download.'}
            </div>
          ) : (
            <iframe title="Quotation PDF" src={pdfUrl} className="h-full w-full" />
          )}
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import settingsApi from '../api/settingsApi.js';
import authApi from '../api/authApi.js';
import { Button, Card, PageHeader, Input, Loading } from '../components/common/ui.jsx';

const EMPTY = {
  companyName: '', tagline: '', email: '', phone: '', address: '', gstin: '', pan: '',
  upiId: '', upiDisplayName: '',
  bankAccountName: '', bankName: '', bankAccountNumber: '', bankIfsc: '',
  paymentAdvance: '', paymentBalance: '', paymentModes: '',
};

export default function Settings() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Change password
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await settingsApi.get();
        setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, data?.[k] ?? ''])) });
      } catch {
        /* defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.update(form);
      toast.success('Settings saved');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pw.currentPassword || !pw.newPassword) {
      toast.error('Enter current and new password');
      return;
    }
    if (pw.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (pw.newPassword !== pw.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword(pw.currentPassword, pw.newPassword);
      toast.success('Password changed');
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        subtitle="Company details shown on quotations & invoices"
        actions={<Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Company Information</h3>
          <div className="space-y-3">
            <Input label="Company Name" value={form.companyName} onChange={set('companyName')} />
            <Input label="Tagline" value={form.tagline} onChange={set('tagline')} />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} />
            <Input label="Phone" value={form.phone} onChange={set('phone')} />
            <Input label="Address" value={form.address} onChange={set('address')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="GSTIN" value={form.gstin} onChange={set('gstin')} />
              <Input label="PAN" value={form.pan} onChange={set('pan')} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">UPI & Payment</h3>
          <div className="space-y-3">
            <div>
              <Input label="UPI ID" value={form.upiId} onChange={set('upiId')} />
              <p className="mt-1 text-xs text-slate-400">Used for the scan-to-pay QR code on quotations & invoices</p>
            </div>
            <Input label="UPI Display Name" value={form.upiDisplayName} onChange={set('upiDisplayName')} />

            <h4 className="pt-2 text-sm font-semibold text-slate-700">Bank Details</h4>
            <Input label="Account Name" value={form.bankAccountName} onChange={set('bankAccountName')} />
            <Input label="Bank Name" value={form.bankName} onChange={set('bankName')} />
            <Input label="Account Number" value={form.bankAccountNumber} onChange={set('bankAccountNumber')} />
            <Input label="IFSC Code" value={form.bankIfsc} onChange={set('bankIfsc')} />
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Payment Terms (on quotation)</h3>
          <div className="space-y-3">
            <Input label="Advance" placeholder="e.g. 50% at booking" value={form.paymentAdvance} onChange={set('paymentAdvance')} />
            <Input label="Balance" placeholder="e.g. 50% on completion" value={form.paymentBalance} onChange={set('paymentBalance')} />
            <Input label="Accepted Modes" placeholder="e.g. Cash / UPI / Card / NEFT" value={form.paymentModes} onChange={set('paymentModes')} />
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Change Password</h3>
          <div className="space-y-3">
            <Input label="Current Password" type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} />
            <Input label="New Password" type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} />
            <Input label="Confirm New Password" type="password" value={pw.confirmPassword} onChange={(e) => setPw((p) => ({ ...p, confirmPassword: e.target.value }))} />
            <Button variant="secondary" onClick={handleChangePassword} disabled={pwSaving}>
              {pwSaving ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

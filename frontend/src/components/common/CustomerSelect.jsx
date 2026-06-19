import { useEffect, useRef, useState } from 'react';
import customerApi from '../../api/customerApi.js';

/**
 * Searchable customer picker. Replaces a raw "Customer ID" text input.
 * Loads customers once, filters by name / phone / code as you type, and
 * returns the selected customer id via onChange(id, customer).
 */
export default function CustomerSelect({ value, onChange, label = 'Customer', required = false }) {
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    customerApi
      .list()
      .then((d) => setCustomers(Array.isArray(d) ? d : d?.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selected = customers.find((c) => c._id === value);
  const term = query.trim().toLowerCase();
  const filtered = term
    ? customers.filter((c) =>
        [c.name, c.phone, c.customerCode].filter(Boolean).join(' ').toLowerCase().includes(term)
      )
    : customers;

  const display = selected ? `${selected.name}${selected.phone ? ' · ' + selected.phone : ''}` : '';

  return (
    <div ref={boxRef} className="relative">
      <span className="mb-1 block text-sm font-medium text-slate-600">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        placeholder={selected ? '' : 'Search customer by name / phone…'}
        value={open ? query : display}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setOpen(true); setQuery(''); }}
      />
      {selected && !open && (
        <button
          type="button"
          onClick={() => onChange('', null)}
          className="absolute right-2 top-[34px] text-slate-400 hover:text-red-500"
          title="Clear"
        >
          ×
        </button>
      )}
      {open && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">No customers found</div>
          )}
          {filtered.slice(0, 50).map((c) => (
            <button
              type="button"
              key={c._id}
              onClick={() => { onChange(c._id, c); setOpen(false); setQuery(''); }}
              className="block w-full px-3 py-2 text-left text-sm transition hover:bg-brand-50"
            >
              <span className="font-medium text-slate-800">{c.name}</span>
              {c.phone && <span className="text-slate-400"> · {c.phone}</span>}
              {c.customerCode && <span className="block text-xs text-slate-400">{c.customerCode}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import employeeApi from '../../api/employeeApi.js';
import { Select } from './ui.jsx';

// Module-level cache so multiple selects on a page don't each refetch.
let _cache = null;

/**
 * Drop-in replacement for an "Employee ID" text input.
 * Loads active employees and renders a dropdown (name + code).
 * Same props as <Select>: value, onChange (native event), label, required, disabled.
 */
export default function EmployeeSelect({
  value,
  onChange,
  label = 'Employee',
  required = false,
  disabled = false,
  includeInactive = false,
}) {
  const [employees, setEmployees] = useState(_cache || []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await employeeApi.list(includeInactive ? undefined : { status: 'active' });
        const list = Array.isArray(data) ? data : data?.items || [];
        if (alive) {
          _cache = list;
          setEmployees(list);
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => { alive = false; };
  }, [includeInactive]);

  return (
    <Select label={label} value={value} onChange={onChange} required={required} disabled={disabled}>
      <option value="">Select employee…</option>
      {employees.map((e) => (
        <option key={e._id} value={e._id}>
          {e.name}{e.employeeCode ? ` (${e.employeeCode})` : ''}
        </option>
      ))}
    </Select>
  );
}

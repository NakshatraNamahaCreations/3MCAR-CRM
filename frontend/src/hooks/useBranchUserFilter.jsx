import { useMemo, useState } from 'react';
import { Select } from '../components/common/ui.jsx';

const idOf = (v) => String((v && typeof v === 'object' ? v._id : v) || '');
const nameOf = (v) => (v && typeof v === 'object' ? v.name : '') || '';

/**
 * Reusable Branch + Created-By filter for any list table whose rows carry
 * populated `branchId` and `createdBy` refs.
 *
 * Usage:
 *   const { filtered, controls } = useBranchUserFilter(searchedRows, () => setPage(1));
 *   // render {controls} in the filter bar, paginate `filtered`
 *
 * Each dropdown only renders when there are 2+ distinct values, so single-branch
 * / single-user tables stay clean.
 */
export function useBranchUserFilter(rows = [], onChange) {
  const [branchId, setBranchId] = useState('');
  const [createdBy, setCreatedBy] = useState('');

  const branches = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => {
      const id = idOf(r.branchId);
      if (id && !m.has(id)) m.set(id, nameOf(r.branchId) || id);
    });
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const users = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => {
      const id = idOf(r.createdBy);
      if (id && !m.has(id)) m.set(id, nameOf(r.createdBy) || id);
    });
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (branchId && idOf(r.branchId) !== branchId) return false;
        if (createdBy && idOf(r.createdBy) !== createdBy) return false;
        return true;
      }),
    [rows, branchId, createdBy]
  );

  const pick = (setter) => (e) => {
    setter(e.target.value);
    if (onChange) onChange();
  };

  const controls = (
    <>
      {branches.length > 1 && (
        <Select label="Branch" value={branchId} onChange={pick(setBranchId)}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </Select>
      )}
      {users.length > 1 && (
        <Select label="Created By" value={createdBy} onChange={pick(setCreatedBy)}>
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </Select>
      )}
    </>
  );

  return { filtered, controls, branchId, createdBy };
}

export default useBranchUserFilter;

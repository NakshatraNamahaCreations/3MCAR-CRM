import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import branchApi from '../api/branchApi.js';
import { useAuth } from './AuthContext.jsx';

const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(
    () => localStorage.getItem('activeBranchId') || ''
  );
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await branchApi.mine();
      const list = data?.branches || [];
      setBranches(list);
      // Establish an active branch if none chosen yet.
      let active = localStorage.getItem('activeBranchId') || data?.activeBranchId || '';
      // 'all' is a valid selection only when the user has more than one branch.
      if (active === 'all') {
        if (list.length <= 1) active = '';
      } else if (active && !list.some((b) => b._id === active)) {
        active = '';
      }
      if (!active && list.length) active = list[0]._id;
      if (active) {
        localStorage.setItem('activeBranchId', active);
        setActiveBranchId(active);
      }
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const switchBranch = async (branchId) => {
    localStorage.setItem('activeBranchId', branchId);
    setActiveBranchId(branchId);
    // 'all' is a client-side view mode — don't persist it as the user's branch.
    if (branchId !== 'all') {
      try {
        await branchApi.switch(branchId);
      } catch {
        /* header already drives scoping; server persist is best-effort */
      }
    }
    // Reload so all data reflects the new selection.
    window.location.reload();
  };

  const isAllBranches = activeBranchId === 'all';
  const activeBranch = branches.find((b) => b._id === activeBranchId) || null;

  return (
    <BranchContext.Provider value={{ branches, activeBranchId, activeBranch, isAllBranches, switchBranch, loading, reloadBranches: load }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within BranchProvider');
  return ctx;
};

export default BranchContext;

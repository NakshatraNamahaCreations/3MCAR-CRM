import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading } from '../components/common/ui.jsx';
import { moduleForPath, canSee, firstAccessiblePath } from './navConfig.js';

const NoAccess = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <p className="text-lg font-semibold text-slate-700">No module access</p>
    <p className="mt-1 text-sm text-slate-500">You don’t have permission to access any module. Please contact your administrator.</p>
  </div>
);

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Authenticating…" />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== 'admin') {
    const item = moduleForPath(location.pathname);
    const blocked = item
      ? !canSee(item, user.role, user.permissions)
      : !!(roles && !roles.includes(user.role));
    if (blocked) {
      const landing = firstAccessiblePath(user.role, user.permissions);
      // Redirect to the first allowed page; if none (or it would loop), show a notice.
      if (landing && landing !== location.pathname) return <Navigate to={landing} replace />;
      return <NoAccess />;
    }
  }
  return children;
};

export default ProtectedRoute;

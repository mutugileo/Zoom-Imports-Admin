import React from 'react';
import { AdminProvider, useAdmin } from './context/AdminContext';

import { AdminDashboard } from './pages/AdminDashboard';
import { AdminVehicles } from './pages/AdminVehicles';
import { AdminParts } from './pages/AdminParts';
import { AdminCompatibility } from './pages/AdminCompatibility';
import { AdminOrders } from './pages/AdminOrders';
import { AdminEnquiries } from './pages/AdminEnquiries';
import { AdminSiteContent } from './pages/AdminSiteContent';
import { AdminSettings } from './pages/AdminSettings';
import { AdminLogin } from './pages/AdminLogin';
import { NoAccess } from './pages/NoAccess';

const VIEWS = {
  'admin-dashboard': AdminDashboard,
  'admin-vehicles': AdminVehicles,
  'admin-parts': AdminParts,
  'admin-compatibility': AdminCompatibility,
  'admin-orders': AdminOrders,
  'admin-enquiries': AdminEnquiries,
  'admin-content': AdminSiteContent,
  'admin-settings': AdminSettings,
};

const AdminRouter = () => {
  const { currentUser, currentView, canView } = useAdmin();

  // Signed out: nothing else mounts. Not security — the data is still in this
  // browser — but it does keep every admin screen off the glass until a PIN
  // has been entered, and it is the seam a real auth check drops into.
  if (!currentUser) return <AdminLogin />;

  // A role can reach a view it is not entitled to by deep-linking or by being
  // demoted while signed in, so the router checks as well as the sidebar.
  if (!canView(currentView)) return <NoAccess />;

  const View = VIEWS[currentView] || AdminDashboard;
  return <View />;
};

// Each admin page renders its own <AdminLayout> wrapper.
export default function App() {
  return (
    <AdminProvider>
      <AdminRouter />
    </AdminProvider>
  );
}

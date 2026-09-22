import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RbacProvider } from './lib/AuthorizationService';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectManagement from './pages/ProjectManagement';
import GanttChart from './pages/GanttChart';
import MilestoneManagement from './pages/MilestoneManagement';
import TaskManagement from './pages/TaskManagement';
import TeamManagement from './pages/TeamManagement';
import DPR from './pages/DPR';
import BudgetManagement from './pages/BudgetManagement';
import DocumentManagement from './pages/DocumentManagement';
import BillingManagement from './pages/BillingManagement';
import CustomerManagement from './pages/CustomerManagement';
import IssueTracker from './pages/IssueTracker';
import AmcDashboard from './pages/amc/AmcDashboard';
import AmcContracts from './pages/amc/AmcContracts';
import AmcPayments from './pages/amc/AmcPayments';
import AmcDocuments from './pages/amc/AmcDocuments';
import AmcHistory from './pages/amc/AmcHistory';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import RoleManagement from './pages/admin/RoleManagement';
import AuditLogs from './pages/admin/AuditLogs';
import EmailConfiguration from './pages/admin/EmailConfiguration';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <Router>
      <RbacProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<ProtectedRoute destinationId="projects" action="VIEW" />}>
              <Route index element={<ProjectManagement />} />
            </Route>
            <Route path="gantt" element={<ProtectedRoute destinationId="gantt" action="VIEW" />}>
              <Route index element={<GanttChart />} />
            </Route>
            <Route path="milestones" element={<ProtectedRoute destinationId="milestones" action="VIEW" />}>
              <Route index element={<MilestoneManagement />} />
            </Route>
            <Route path="tasks" element={<ProtectedRoute destinationId="tasks" action="VIEW" />}>
              <Route index element={<TaskManagement />} />
            </Route>
            <Route path="team" element={<ProtectedRoute destinationId="team" action="VIEW" />}>
              <Route index element={<TeamManagement />} />
            </Route>
            <Route path="dpr" element={<ProtectedRoute destinationId="dpr" action="VIEW" />}>
              <Route index element={<DPR />} />
            </Route>
            <Route path="budget" element={<ProtectedRoute destinationId="projects" action="VIEW" />}>
              <Route index element={<BudgetManagement />} />
            </Route>
            <Route path="billing" element={<ProtectedRoute destinationId="billing" action="VIEW" />}>
              <Route index element={<BillingManagement />} />
            </Route>
            <Route path="documents" element={<ProtectedRoute destinationId="documents" action="VIEW" />}>
              <Route index element={<DocumentManagement />} />
            </Route>
            <Route path="customers" element={<ProtectedRoute destinationId="amc" action="VIEW" />}>
              <Route index element={<CustomerManagement />} />
            </Route>
            <Route path="issues" element={<ProtectedRoute destinationId="issues" action="VIEW" />}>
              <Route index element={<IssueTracker />} />
            </Route>
            <Route path="amc" element={<ProtectedRoute destinationId="amc" action="VIEW" />}>
              <Route index element={<AmcDashboard />} />
            </Route>
            <Route path="amc/contracts" element={<ProtectedRoute destinationId="amc" action="VIEW" />}>
              <Route index element={<AmcContracts />} />
            </Route>
            <Route path="amc/payments" element={<ProtectedRoute destinationId="amc" action="VIEW" />}>
              <Route index element={<AmcPayments />} />
            </Route>
            <Route path="amc/documents" element={<ProtectedRoute destinationId="amc" action="VIEW" />}>
              <Route index element={<AmcDocuments />} />
            </Route>
            <Route path="amc/history" element={<ProtectedRoute destinationId="amc" action="VIEW" />}>
              <Route index element={<AmcHistory />} />
            </Route>
            
            {/* Admin Routes */}
            <Route path="admin" element={<ProtectedRoute destinationId="access_hub" action="VIEW" />}>
              <Route index element={<AdminDashboard />} />
            </Route>
            
            <Route path="admin/users" element={<ProtectedRoute destinationId="access_hub" action="VIEW" />}>
              <Route index element={<UserManagement />} />
            </Route>
            
            <Route path="admin/roles" element={<ProtectedRoute destinationId="access_hub" action="VIEW" />}>
              <Route index element={<RoleManagement />} />
            </Route>
            
            <Route path="admin/audit" element={<ProtectedRoute destinationId="access_hub" action="VIEW" />}>
              <Route index element={<AuditLogs />} />
            </Route>

            <Route path="admin/email-config" element={<ProtectedRoute destinationId="access_hub" action="VIEW" />}>
              <Route index element={<EmailConfiguration />} />
            </Route>
            <Route path="admin/notifications" element={<ProtectedRoute destinationId="access_hub" action="VIEW" />}>
              <Route index element={<EmailConfiguration />} /> {/* Placeholder */}
            </Route>
            <Route path="admin/email-logs" element={<ProtectedRoute destinationId="access_hub" action="VIEW" />}>
              <Route index element={<EmailConfiguration />} /> {/* Placeholder */}
            </Route>

            <Route path="unauthorized" element={<Unauthorized />} />
          </Route>
        </Routes>
      </RbacProvider>
    </Router>
  );
}

export default App;

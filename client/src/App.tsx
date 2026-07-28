import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<ProjectManagement />} />
          <Route path="gantt" element={<GanttChart />} />
          <Route path="milestones" element={<MilestoneManagement />} />
          <Route path="tasks" element={<TaskManagement />} />
          <Route path="team" element={<TeamManagement />} />
          <Route path="dpr" element={<DPR />} />
          <Route path="budget" element={<BudgetManagement />} />
          <Route path="billing" element={<BillingManagement />} />
          <Route path="documents" element={<DocumentManagement />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="issues" element={<IssueTracker />} />
          <Route path="amc" element={<AmcDashboard />} />
          <Route path="amc/contracts" element={<AmcContracts />} />
          <Route path="amc/payments" element={<AmcPayments />} />
          <Route path="amc/documents" element={<AmcDocuments />} />
          <Route path="amc/history" element={<AmcHistory />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

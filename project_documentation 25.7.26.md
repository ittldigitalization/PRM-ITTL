# CRM Digitalization (INDO TECH) - Project Documentation

This document provides a start-to-end overview of the **CRM Digitalization / Enterprise Project Management System (EPMS)** built for Indo Tech. It transitions from a high-level business understanding down to the low-level technical implementation and database architecture.

---

## 1. High-Level Overview (Business & Functional)

The application is a comprehensive web-based portal designed to manage projects, day-to-day operations, finances, and Annual Maintenance Contracts (AMCs). It acts as a centralized dashboard for Project Managers and Administrators to track the entire lifecycle of client engagements.

### Core Modules

1. **Planning & Strategy**
   - **Projects**: Define project scopes, timelines, codes, budgets, and track their ongoing statuses.
   - **Milestones**: Break down projects into key deliverables with start and end dates.
   - **Gantt Chart**: A visual timeline of projects and their corresponding milestones/tasks to track dependencies and schedules.

2. **Operations & Execution**
   - **Tasks**: Assign work to teams or individuals (e.g., UI/UX Designers, Developers), track statuses (Started, Blocked, Completed).
   - **Issue Tracker**: A dedicated support desk to log, monitor, and resolve day-to-day project issues, complete with analytics and summary dashboards.
   - **Team Management**: Form teams, assign team leads, and map users to specific teams.
   - **Daily Progress Reports (DPR)**: Employees log their daily hours worked and task progression (0-100%).

3. **Finance & Accounting**
   - **Budget**: Set global financial constraints and track actual costs against estimated budgets per project.
   - **Billing**: Manage invoices, track paid amounts vs. pending balances, and monitor GST components.

4. **AMC Management (Annual Maintenance Contracts)**
   - **Vendors**: Manage third-party vendors and external contractors.
   - **Contracts**: Create and track AMCs, monitor renewal dates, contract amounts, and service frequencies (Monthly, Quarterly, Half Yearly, Annually).
   - **Payments**: Manage payment schedules and balances for specific AMCs.
   - **Documents & History**: Store vendor agreements, upload files securely, and trace the history of contracts.

---

## 2. Mid-Level Architecture (System Design)

The application uses a modern, decoupled architecture leveraging a React frontend and a Backend-as-a-Service (BaaS) provider.

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v3/v4, Lucide React (for iconography)
- **Routing**: React Router v7 (`react-router-dom`)
- **Backend / Database**: Supabase (PostgreSQL)
- **Real-time Sync**: Supabase Realtime Channels (WebSockets)
- **Data Visualization**: Recharts (for dashboards), Gantt-Task-React (for timelines)

### Architectural Patterns
- **Single Page Application (SPA)**: The entire app runs in the browser, providing a seamless, flicker-free experience.
- **Real-time Subscriptions**: The application subscribes to Postgres database changes via Supabase Channels. When an issue, contract, or project is updated by one user, the dashboard automatically updates for all other users instantly without requiring a page refresh.
- **Role-Based Layout**: The application utilizes a persistent `DashboardLayout` that wraps page content, providing a side navigation bar and top header containing user context.

---

## 3. Low-Level Implementation (Code & Database)

### 3.1 Directory Structure
```text
client/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components (DashboardLayout, etc.)
│   ├── lib/
│   │   └── supabase.ts     # Supabase client initialization
│   ├── pages/              # Application views/screens
│   │   ├── amc/            # AMC-specific pages (AmcContracts, AmcDashboard, etc.)
│   │   ├── issues/         # Issue tracking related files
│   │   ├── BudgetManagement.tsx
│   │   ├── CustomerManagement.tsx (Now used for Vendors)
│   │   ├── Dashboard.tsx
│   │   ├── DPR.tsx
│   │   ├── GanttChart.tsx
│   │   ├── IssueTracker.tsx
│   │   ├── MilestoneManagement.tsx
│   │   ├── ProjectManagement.tsx
│   │   ├── TaskManagement.tsx
│   │   └── TeamManagement.tsx
│   ├── App.tsx             # Root router configuration
│   ├── index.css           # Global Tailwind styles
│   └── main.tsx            # React application entry point
```

### 3.2 Database Schema (PostgreSQL)

The database relies heavily on relational mapping and Foreign Keys (`UUID`s) to maintain data integrity.

#### Key Entities & Relationships:

1. **`users`**
   - Stores all system users (Project Managers, Developers).
   - Contains Enum roles (`user_role`) and statuses.

2. **`projects`**
   - The root entity.
   - Links one-to-many to `milestones`, `tasks`, `dprs`, and `documents`.

3. **`tasks`** & **`dprs`**
   - Tasks belong to projects.
   - DPRs (Daily Progress Reports) track the granular hours spent on those tasks.

4. **`customers` (Vendors)**
   - Tracks third-party entities.
   - **Note:** Recently updated in the UI to act exclusively as a "Vendor" directory. The `email` column was deprecated and removed from the application payload to streamline vendor creation.

5. **AMC Module (`amc_contracts`, `amc_payments`, `amc_documents`)**
   - `amc_contracts` links directly to `customers` (`customer_id`).
   - Tracks `start_date`, `end_date`, `contract_amount`, and `service_frequency`.
   - `amc_payments` tracks invoices against specific contracts (`amc_id`).

### 3.3 Security & Data Access
- **Row-Level Security (RLS)**: Postgres RLS is designed to restrict data access based on authentication. 
- *Note for Development:* Currently, RLS policies have been explicitly disabled (`DISABLE ROW LEVEL SECURITY`) via migration scripts (`amc_migration.sql`, etc.) on tables like `customers` and `amc_contracts` to facilitate rapid development and testing from the frontend without a strict auth mechanism.

### 3.4 Key Code Flows

**Example: Fetching & Subscribing to Data (The Real-time Pattern)**
Most pages follow a standard React pattern for data fetching combined with Supabase real-time listeners:

```typescript
// 1. Fetch initial data on mount
useEffect(() => {
  fetchData();

  // 2. Subscribe to real-time changes
  const subscription = supabase
    .channel('table_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'target_table' }, () => {
      fetchData(); // 3. Refetch when another user makes a change
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription); // Cleanup on unmount
  };
}, []);
```

**Example: Saving Data (Create / Update)**
Data mutations handle both INSERT and UPDATE within a unified function, relying on the presence of an `id` to determine the action.

```typescript
const handleSave = async (e) => {
  e.preventDefault();
  
  const payload = {
    name: formData.name,
    phone: formData.phone,
    address: formData.address
    // email was intentionally removed based on recent requirements
  };

  if (formData.id) {
    await supabase.from('table').update(payload).eq('id', formData.id);
  } else {
    await supabase.from('table').insert([payload]);
  }
};
```

---

## Conclusion
The INDO TECH CRM Digitalization platform is a highly modular, real-time application. By leveraging Supabase's BaaS capabilities alongside React, it minimizes backend boilerplate while maintaining a robust, scalable, and instantly responsive experience for operations and management teams.

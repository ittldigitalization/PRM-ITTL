# CRM Digitalization - Technical & User Guide

Welcome to the comprehensive technical and user guide for the **INDO TECH CRM Digitalization** application. This document is designed to be accessible for both developers and end-users.

---

## 1. System Architecture (Technical Overview)

The application is built on a modern, high-performance web stack designed for scalability and speed.

### Tech Stack
* **Frontend:** React 18, TypeScript, Vite
* **Routing:** React Router v6
* **Styling:** Custom CSS (Modern SaaS Aesthetic, Glassmorphism, CSS Variables)
* **Icons:** Lucide React
* **Backend / Database:** Supabase (PostgreSQL)
* **Authentication:** Supabase Auth (Email/Password)
* **Security:** Row Level Security (RLS) on PostgreSQL tables

### Directory Structure
* `/client/src/components` - Reusable UI elements (Layout, Sidebar, Modals, Forms)
* `/client/src/pages` - Main application views (Dashboard, AMC Management, Projects)
* `/client/src/lib` - Configuration files (Supabase client setup)
* `/server` - Backend configuration or proxy scripts (if applicable)

---

## 2. User Guide (How to Use the App)

The application is divided into core modules accessible via the sleek left-hand sidebar.

### Overview
* **Dashboard:** The main landing page giving a high-level summary of your CRM data.

### Planning
* **Projects:** Create and manage client projects.
* **Milestones:** Track key deliverables for your projects.
* **Gantt Chart:** Visualize project timelines and dependencies.

### Operations
* **Tasks:** Assign and track daily operations.
* **Issue Tracker:** Log bugs, client complaints, or operational roadblocks.
* **Team:** Manage employee records and roles.
* **DPR (Daily Progress Report):** Track daily operational metrics.
* **Documents:** Central repository for shared operational files.

### Finance
* **Budget:** Track allocated vs. spent funds.
* **Billing:** Generate and review client invoices.

### AMC Management (Advanced)
A specialized module for managing Annual Maintenance Contracts.
* **Vendor (Customers):** Add client details and Contact Persons.
* **Contracts:** Manage active agreements (Base Amounts vs. GST are tracked separately).
* **Payments:** Log invoices and payment statuses (Pending, Partial, Paid).
* **History:** View historical lifecycle data for past contracts.

> [!TIP]
> **Navigation Tip:** Hover over the sidebar items to see the smooth interactive animations. You can collapse/expand the AMC Management tab by clicking on it.

---

## 3. UI/UX Design System

The application utilizes a state-of-the-art SaaS design system:
* **Typography:** `Inter` for highly readable body text (12-14px) and `Outfit` for sharp headings (16px+).
* **Color Palette:** 
  * Primary Accent: **Electric Indigo** (`#4F46E5`)
  * Backgrounds: Crisp Whites (`#FFFFFF`) and Cool Grays (`#F9FAFB`)
* **Components:** 
  * Cards and Modals use a `12px` border radius with soft, layered drop-shadows.
  * Modals utilize a frosted-glass backdrop (`backdrop-filter: blur(8px)`).
  * Status badges are pill-shaped with tinted translucent backgrounds.

---

## 4. Common Troubleshooting

> [!WARNING]
> **Data Disappearing / Not Loading?**
> If you add a record but it doesn't show up in the table, it is likely a **Supabase Row Level Security (RLS)** issue. Ensure that you are either logged in, or that your Supabase tables have a policy allowing `SELECT` and `INSERT` for anonymous/authenticated users.

> [!IMPORTANT]
> **Port Conflicts:**
> If the application fails to start via `npm start`, check the terminal. The startup script will automatically try port `7455`, `7456`, etc. Always use the link provided in the terminal output.

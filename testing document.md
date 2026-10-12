# CRM Digitalization - Testing & QA Document

This document outlines the testing strategy, test cases, and quality assurance (QA) protocols for the INDO TECH CRM application.

---

## 1. Testing Strategy

The application should be tested across three main pillars:
1. **Functional Testing:** Ensuring buttons, forms, and database queries work as expected.
2. **UI/UX Testing:** Ensuring the modern aesthetic renders correctly across devices.
3. **Security Testing:** Verifying Supabase Row Level Security (RLS) policies.

---

## 2. Core Functional Test Cases

### Test Suite: Authentication
| Test ID | Scenario | Steps to Reproduce | Expected Result |
|---------|----------|--------------------|-----------------|
| AUTH-01 | Successful Login | 1. Navigate to `/login` <br> 2. Enter valid credentials <br> 3. Click Login | User is redirected to Dashboard (`/`). |
| AUTH-02 | Invalid Login | 1. Navigate to `/login` <br> 2. Enter invalid credentials | System displays "Invalid login credentials" error. |
| AUTH-03 | Session Persistence | 1. Login successfully <br> 2. Hard refresh page (F5) | User remains logged in. |

### Test Suite: AMC Management (Forms & Data)
| Test ID | Scenario | Steps to Reproduce | Expected Result |
|---------|----------|--------------------|-----------------|
| AMC-01 | Create Vendor | 1. Go to AMC > Vendor <br> 2. Click "Add New" <br> 3. Fill details (incl. Contact Person) <br> 4. Save | Modal closes; new vendor appears immediately in the table. |
| AMC-02 | Payment Calculation | 1. Go to AMC > Payments <br> 2. Add Payment <br> 3. Enter Amount: 1000, GST: 180 | Total/Paid Amount auto-calculates to 1180. |
| AMC-03 | Invoice Reference | 1. Edit a Payment <br> 2. Add Invoice Reference "INV-999" <br> 3. Save | The table updates to show "INV-999" in the correct column. |

### Test Suite: Navigation & Routing
| Test ID | Scenario | Steps to Reproduce | Expected Result |
|---------|----------|--------------------|-----------------|
| NAV-01 | Sidebar Routing | 1. Click "Projects" <br> 2. Click "Tasks" | URL updates to `/projects` then `/tasks`; correct views render. |
| NAV-02 | Active States | 1. Click "Gantt Chart" | "Gantt Chart" text in sidebar turns Indigo (`#4F46E5`); others remain gray. |

---

## 3. UI/UX Visual Testing Checklist

Run through this checklist whenever global CSS (`index.css`) or layout components are modified:

- [ ] **Typography:** Are all headings sized at `16px` and subheadings at `14px`?
- [ ] **Hover Effects:** Does hovering over the "AMC Management" button smoothly change its text color?
- [ ] **Tables:** Do table rows subtly scale up (`scale(1.002)`) and highlight when hovered?
- [ ] **Modals:** When clicking "Add New", does the background blur correctly (Frosted Glass effect)?
- [ ] **Buttons:** Do Primary buttons have a soft Indigo glowing shadow?

---

## 4. Security & Database Testing (Supabase)

> [!CAUTION]
> **Row Level Security (RLS) Verification**
> If RLS is enabled on Supabase, frontend queries will fail silently or return empty arrays if policies are not set.

**How to Test RLS:**
1. Open the browser Network Tab (F12).
2. Attempt to save a new record (e.g., a new Customer).
3. Inspect the `POST` or `PATCH` request to `[project-url].supabase.co/rest/v1/...`
4. **Pass Criteria:** The response code is `201 Created` or `200 OK`.
5. **Fail Criteria:** The response code is `401 Unauthorized` or `403 Forbidden`. If this happens, you must go to the Supabase Dashboard > Authentication > Policies and add an `INSERT/UPDATE/SELECT` policy for the affected table.

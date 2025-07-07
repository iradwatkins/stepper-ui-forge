# Role-Based Dashboard & Tab Structure Blueprint (v6)

This document outlines the structure and content for user dashboards, dynamically adapting based on the user's assigned role(s). The central component is the `UnifiedDashboard`, which serves as the main container.

## I. Core Principles

1.  **Role-Driven Interface:** The `UnifiedDashboard` will determine visible tabs and content based on the logged-in user's roles. A user can have multiple roles, and all relevant functionalities should be accessible. Reseller and Employee specific tabs/dashboards appear only after Promoter approval.
2.  **Resource Prioritization (CRITICAL):**
    * **Supabase Tables:** Before defining new tables, **thoroughly analyze existing Supabase tables** (e.g., `profiles`, `events`, `tickets`, etc.) to determine if they can store the required data. Prefer extending existing tables (e.g., adding columns) over creating new ones if the core entity is the same. Avoid data duplication.
    * **Code Components:** Before creating new React components or utility functions, **review existing codebase** for reusable elements. Extend existing components where feasible. Avoid duplicating logic.
3.  **Design for Clarity & Mobile-First:**
    * Dashboards should be organized intuitively. For complex sections like the "Promoter Hub," use clear navigation (tabs, sidebar links on desktop, accordion/list on mobile) to prevent clutter.
    * Content, especially data tables and charts in "Analytics," must be designed to be responsive and legible on mobile devices.
    * **Prioritize quick access to core actions**, like ticket scanning.

---

## II. `UnifiedDashboard` Structure & Key UI Elements

### A. Prominent "Scan a Ticket" Button (For Promoters & Approved Employees)

* **Placement:** This button should be highly visible and instantly accessible in the main application header, potentially replacing a less critical global element like a general "Notifications" button if header space is limited. It should be available as soon as a Promoter or an active, approved Employee is logged in.
    * **Example Location:** Top right of the main application header, near the user's profile/name area.
* **Appearance:** A clear button with text like "Scan a Ticket" or an intuitive icon (e.g., QR code symbol).
* **Functionality:** Directly launches the `GateScanner` component (which supports QR and manual numeric code entry).
    * If the user is associated with a single active event, the scanner could default to that event.
    * If multiple events are active or no default is clear, it might prompt for event selection before opening the scanner interface.
* **Target Users:** Promoters, and Employees who have been approved and assigned scanning duties by a Promoter.
* **Mobile Consideration:** On smaller screens, this might remain in the header or be part of a quickly accessible bottom navigation bar if a global header is not persistent.

### B. General User (Default View / Base for Other Roles)

* **Tab: "My Tickets"**
    * **Content:** Displays tickets the user personally owns (purchased for attendance).
    * **Component(s):** `MyTicketsPage` (or similar existing component for displaying user-owned tickets).
    * **Data Source(s):** Utilize existing Supabase `tickets` table, filtered by the authenticated user's ID.

---

### C. Promoter Role View

A user with the "Promoter" role will see the following tabs within the `UnifiedDashboard`:

1.  **Tab: "My Tickets"**
    * **Content:** Same as the General User view – tickets the promoter personally owns.
    * **Component(s):** `MyTicketsPage` (Reuse existing).
    * **Data Source(s):** Supabase `tickets` table (Reuse existing).

2.  **Tab: "Promoter Hub"** (Primary operational center for Promoters)
    * **Content:** This tab acts as a gateway or container for various promoter functionalities, organized into distinct, easily accessible sections. This could be implemented using top-level sub-tabs within the "Promoter Hub" for "Event Management," "Reseller Management," "Scanner Management," "Analytics," and "Settings."
    * **Hub Sections (Conceptual Layout - these would be top-level navigations within Promoter Hub):**

        * **Section/Sub-Tab: Event Management & Overview** (This is now the primary landing section for the Promoter Hub)
            * **At the Top (Formerly "My Promoter Dashboard" content):**
                * Key statistics (e.g., overall sales for active event, total upcoming events, recent check-ins) presented as clear, concise cards.
                * Quick links or calls to action for most relevant tasks (e.g., "View Active Event Details," "Manage Resellers," "Manage Scanners").
            * **Main Content: Event List**
                * Displays a list of existing events created by the promoter. Each event item in the list will feature:
                    * Event Name, Date, Location, Key Stats (Tickets Sold, Revenue for that event).
                    * **Action Buttons for each event:**
                        * **Edit Button:**
                            * **Action:** Navigates to the `EventEditForm` component, pre-filled with the specific event's data.
                            * **Purpose:** Allows the promoter to modify details of that event.
                        * **Analytics Button:**
                            * **Action:** Navigates to the "Analytics Hub" section/sub-tab, with the view potentially pre-filtered or focused on the selected event's analytics (e.g., showing sales and attendance reports specifically for this event).
                            * **Purpose:** Provides quick access to performance data for that event.
                        * **Manage Tickets Button:**
                            * **Action:** Navigates to a dedicated view/component (e.g., `EventTicketManagementView`) for that specific event. This view will display a list of all tickets sold for this event, showing details like Ticket ID, Buyer Name/Email (respecting privacy settings), Ticket Type, Status (Valid, Scanned, Refunded), Purchase Date. It may also include actions like "View Ticket Details," "Resend Confirmation Email," or "Issue Refund" (with appropriate permissions and confirmations).
                            * **Purpose:** Allows the promoter to view and manage individual tickets sold for a specific event.
                            * **Component(s):** `EventTicketManagementView` (likely a new component, using a reusable `TicketList` component internally, filtered by `event_id`).
                            * **Data Source(s):** Supabase `tickets` table, `profiles` (for buyer info), filtered by the specific `event_id`.
                        * **Trash (Delete) Button:**
                            * **Action:** Triggers a confirmation modal (e.g., "Are you sure you want to delete [Event Name]? This action cannot be undone and may affect active tickets and resellers."). Upon confirmation, performs a soft delete (e.g., setting an `is_deleted` flag or `status = 'deleted'`) or hard delete (if business logic allows) of the event from the Supabase `events` table. Consider implications for associated tickets, sales data, etc.
                            * **Purpose:** Allows the promoter to remove an event.
                * **Other Actions:**
                    * "Create New Event" button (leading to `EventCreateForm`).
            * **Component(s):** `EventManagementDashboard` (a new container component for this combined view), `DashboardStatsCards`, `EventList` (with integrated action buttons per event), `EventCreateForm`, `EventEditForm`, `EventTicketManagementView`. (Review if existing event management components can be adapted/reused. Ensure mobile-friendly table/list views for events).
            * **Data Source(s):** Supabase `events` table (Primary table for event data), aggregated data from `tickets` for stats.
            * **Mobile View Note:** Event lists should use responsive tables or card views, with action buttons accessible (e.g., via a "kebab" menu icon per item on smaller screens if direct buttons cause clutter). Stats should be easily digestible.

        * **Section/Sub-Tab: Reseller Management (Ticket Sellers)**
            * **Content:** Invite new users to be Resellers, view list of associated Resellers (pending approval, active, inactive), approve/reject pending applications, assign events to active Resellers, set/edit commission rates, enable/disable Reseller accounts.
            * **Note:** Reseller Dashboard activation for a user is contingent on Promoter approval here. An Employee can also be invited/approved as a Reseller.
            * **Component(s):** `ResellerManagementDashboard`, `InviteResellerForm`, `ResellerApprovalQueueList` (Build upon any existing user/role management components. Ensure lists are searchable/filterable and actions are clear).
            * **Data Source(s):**
                * Supabase `profiles` table (for user info – **reuse existing**).
                * `promoter_reseller_assignments` (or similar existing table linking promoters, users in reseller role, events, commission, status – **verify if an existing assignments/permissions table can be adapted**).
            * **Mobile View Note:** Lists should be responsive, with actions accessible via menus or clear buttons. Forms should be mobile-friendly.

        * **Section/Sub-Tab: Scanner Management (Employees/Staff)**
            * **Content:** Invite new users to be Employees, view list of associated Employees (pending approval, active, inactive), approve/reject pending applications, assign events and specific roles (e.g., scanner, gate manager) to active Employees, grant/revoke ticket scanning permissions, enable/disable Employee accounts.
            * **Note:** Employee/Scanner Dashboard activation for a user is contingent on Promoter approval here. A Reseller can also be invited/approved as an Employee.
            * **Component(s):** `EmployeeManagementDashboard`, `InviteEmployeeForm`, `EmployeeApprovalQueueList` (Build upon any existing user/role management components).
            * **Data Source(s):**
                * Supabase `profiles` table (for user info – **reuse existing**).
                * `promoter_employee_assignments` (or similar existing table linking promoters, users in employee role, events, roles, status – **verify if an existing assignments/permissions table can be adapted**).
            * **Mobile View Note:** Similar to Reseller Management, ensure mobile-friendly lists and forms.

        * **Section/Sub-Tab: Analytics Hub**
            * **Content:** "Analytics will be available soon. (Planned: Sales Reports, Attendance & Check-in Reports, Audience Insights)"
            * **Overview (Future):** Display key headline analytics with links to detailed reports.
            * **Navigation (Future):** Use sub-tabs or a clear list navigation for different report categories.
            * **Sub-Section/Report: Sales Reports (Future)**
                * Overall Sales, Sales by Event, Sales by Ticket Type.
                * Reseller Team Performance: Total sales/revenue by team, individual reseller stats, leaderboard.
                * Revenue Trends: Visualizations (charts) of sales over time.
                * **Component(s):** `SalesReportsDashboard`, `RevenueChart` (use responsive chart libraries), `ResellerPerformanceTable` (ensure tables are responsive or use card views on mobile).
                * **Data Source(s):** Primarily existing Supabase `events`, `tickets` (ensure `tickets` table can link to a reseller via a `sold_by_reseller_id` FK, possibly to `profiles.id`), `ticket_types` (if used, **reuse existing**), and the reseller assignment table.
            * **Sub-Section/Report: Attendance & Check-in Reports (Future)**
                * Check-in Rate per event.
                * Peak Check-in Times (visualized).
                * Attendance by Ticket Type.
                * No-Show Analysis.
                * **Component(s):** `AttendanceReportsDashboard`, `CheckInTimeSeriesChart` (responsive charts).
                * **Data Source(s):** Supabase `tickets` table (utilize/add columns like `status`, `scan_timestamp`, `scanned_by_employee_id` FK to `profiles.id`), `events` table.
            * **Sub-Section/Report: Audience Insights (Basic) (Future)**
                * Aggregated, anonymized data on buyer demographics/preferences.
                * **Component(s):** `AudienceOverviewWidgets` (simple, clear visuals).
                * **Data Source(s):** Aggregated from Supabase `tickets`, `profiles` (of buyers – **reuse existing**).
            * **Mobile View Note (Future):** Each report type should be a dedicated, navigable view. Charts must be responsive or offer simplified versions for smaller screens. Data tables should be designed for mobile.

        * **Section/Sub-Tab: Settings Hub**
            * **Content:** "Settings will be available soon. (Planned: Promoter Profile, Payment & Payouts, Notification Preferences, Team Management Defaults, API & Webhooks)"
            * **Navigation (Future):** Use sub-tabs or a clear list navigation for different settings categories.
            * **Sub-Section: Promoter Profile (Future)**
                * Edit organization name, contact info, logo.
                * **Component(s):** `PromoterProfileForm` (Ensure forms are mobile-friendly with clear labels and inputs).
                * **Data Source(s):** Supabase `profiles` table (extend with promoter-specific fields like `organization_name`, `promoter_logo_url` if they don't exist, rather than a new table if `profiles` can accommodate). Alternatively, a `promoter_details` table linked 1:1 with `profiles`.
            * **Sub-Section: Payment & Payouts (Future)**
                * Configure payout info, view history.
                * **Component(s):** `PayoutSettingsForm`, `PayoutHistoryTable`.
                * **Data Source(s):**
                    * `profiles` or `promoter_details` for Stripe ID (**extend existing**).
                    * `payouts` table (new table if not existing, for logging payout transactions, linked to promoter's profile).
            * **Sub-Section: Notification Preferences (Future)**
                * Toggle email/in-app notifications.
                * **Component(s):** `NotificationSettingsForm`.
                * **Data Source(s):** `user_notification_settings` table (new if not existing, linked to `profiles.id`, stores preferences per notification type).
            * **Sub-Section: Team Management Defaults (Future)**
                * Default commission rates, event access/roles.
                * **Component(s):** `TeamDefaultsForm`.
                * **Data Source(s):** Store in `profiles` (promoter-specific JSONB field) or `promoter_details` table (**extend existing**).
            * **Sub-Section: API & Webhooks (Advanced) (Future)**
                * Manage API keys, configure webhook endpoints.
                * **Component(s):** `ApiKeysManagement`, `WebhookConfiguration`.
                * **Data Source(s):** `promoter_api_keys`, `promoter_webhooks` tables (likely new, linked to promoter's profile, if this functionality doesn't exist).
            * **Mobile View Note (Future):** Each settings category should be a distinct, easily navigable form/view. Forms should be well-structured for mobile input.

---

### D. Reseller Role View (Ticket Seller)

*(Visibility of this dashboard/tab for a user is contingent on Promoter approval and role activation via the "Reseller Management" section in Promoter Hub)*

1.  **Tab: "Reseller Dashboard"**
    * **Content:** Sales activities for **approved** events. List authorized events, unique reseller links, sales figures, commissions. Presented in a clear, mobile-friendly manner.
    * **Component(s):** `TicketSellerSalesPage` or `ResellerDashboardContent` (Adapt/reuse existing reseller components, ensure mobile responsiveness).
    * **Data Source(s):** Supabase `events`, `tickets` (filtered by their `sold_by_reseller_id`), `promoter_reseller_assignments` (or adapted existing permissions table).

2.  **Tab: "My Tickets"**
    * **Content:** Tickets the reseller personally owns.
    * **Component(s):** `MyTicketsPage` (Reuse existing).

---

### E. Employee Role View (Scanner/Staff)

*(Visibility of this dashboard/tab for a user is contingent on Promoter approval and role activation via the "Scanner Management" section in Promoter Hub)*

1.  **Tab: "Scanner Dashboard" / "Event Staff Portal"**
    * **Content:** Event check-in for **assigned** events. List assigned events, quick access to scan log. Designed for quick access and efficient operation on mobile devices. The "Scan a Ticket" button (II.A) would be the primary interaction point for scanning.
    * **Component(s):** `EmployeeDashboardContent`, `AssignedEventsList`, `ScanActivityLog`. (The `GateScanner` is accessed via the global "Scan a Ticket" button).
    * **Data Source(s):** Supabase `events`, `promoter_employee_assignments` (for assigned events/roles), `tickets` (for scan validation and logging `scanned_by_employee_id`).

2.  **Tab: "My Tickets"**
    * **Content:** Tickets the employee personally owns.
    * **Component(s):** `MyTicketsPage` (Reuse existing).

---

## VI. Handling Users with Multiple Roles

* **Additive Tabs:** Users see tabs for all *approved and active* roles.
* **Clear Navigation:** `UnifiedDashboard` tabs should be distinct and easy to understand.
* **Data Scoping:** Data within each role's section must be correctly scoped.

---

## VII. Implementation Guidance Summary (Reiterating Resource Prioritization)

* **Resource Prioritization (CRITICAL):**
    * **Supabase Tables:** Before defining new tables, **ALWAYS analyze existing Supabase tables** to determine if they can store the required data. Prefer extending existing tables (e.g., adding columns, using JSONB fields for role-specific settings) over creating new ones if the core entity is the same. Document why a new table is necessary if existing ones cannot be adapted.
    * **Code Components & Logic:** Before creating new React components or utility functions, **ALWAYS review the existing codebase** for reusable elements. Extend existing components where feasible. Document why new code is necessary if existing code cannot be adapted.
* **Robust Role Detection & Approval Flow:**
    * User roles and their approval statuses (e.g., `pending_promoter_approval`, `active`, `inactive`) must be clearly stored, likely extending the `profiles` table or using dedicated assignment tables (e.g., `user_event_roles` or `team_assignments`) that link `profiles` to `events` with a role and status.
    * Reseller and Employee specific dashboards/tabs become accessible *only* once their respective role status for a given promoter/event is `active`.
* **Conditional Rendering:** Based on *active and approved* roles.
* **Logical Separation:** Maintain clear distinctions in functionality.
* **Mobile-First Design Thinking:** The conceptual organization should lend itself to a responsive design that prioritizes mobile usability for on-the-go tasks like scanning or quick checks. The "Scan a Ticket" button is a key part of this.


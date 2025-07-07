# Role-Based Dashboard & Tab Structure Blueprint (v7)

This document outlines the structure and content for user dashboards, dynamically adapting based on the user's assigned role(s). The central component is the `UnifiedDashboard`, which serves as the main container.

## I. Core Principles

1.  **Role-Driven Interface:** The `UnifiedDashboard` will determine visible tabs and content based on the logged-in user's roles. A user can have multiple roles, and all relevant functionalities should be accessible. Reseller and Employee specific tabs/dashboards appear only after Promoter approval.
2.  **Resource Prioritization (CRITICAL):**
    * **Supabase Tables:** Before defining new tables, **thoroughly analyze existing Supabase tables** (e.g., `profiles`, `events`, `tickets`, etc.) to determine if they can store the required data. Prefer extending existing tables (e.g., adding columns) over creating new ones if the core entity is the same. Avoid data duplication.
    * **Code Components:** Before creating new React components or utility functions, **review existing codebase** for reusable elements. Extend existing components where feasible. Avoid duplicating logic.
3.  **Design for Clarity & Mobile-First (RESPONSIVENESS IS KEY):**
    * Dashboards should be organized intuitively. For complex sections like the "Promoter Hub," use clear navigation (tabs, sidebar links on desktop, accordion/list on mobile) to prevent clutter.
    * All UI elements (text, buttons, forms, tables, charts) **must be fully responsive** and adapt gracefully to different screen sizes, from mobile to desktop.
    * Content, especially data tables and charts in "Analytics," must be designed to be responsive and legible on mobile devices.
    * **Prioritize quick access to core actions**, like ticket scanning.

---

## II. `UnifiedDashboard` Structure & Key UI Elements

### A. Prominent "Scan a Ticket" Button (For Promoters & Approved Employees)

* **Placement:** This button should be highly visible and instantly accessible in the main application header, potentially replacing a less critical global element if header space is limited. It should be available as soon as a Promoter or an active, approved Employee is logged in.
    * **Example Location:** Top right of the main application header, near the user's profile/name area.
* **Appearance:** A clear button with text like "Scan a Ticket" or an intuitive icon (e.g., QR code symbol). Ensure the button size and tap target are mobile-friendly.
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
    * **Content:** This tab acts as a gateway or container for various promoter functionalities, organized into distinct, easily accessible sections. The navigation within the Promoter Hub (e.g., for Event Management, Reseller Management, etc.) must be responsive. See Section VIII for detailed responsive strategies.
    * **Hub Sections (Conceptual Layout - these would be top-level navigations within Promoter Hub):**

        * **Section/Sub-Tab: Event Management & Overview**
            * **At the Top:** Key statistics presented as clear, concise cards that stack on mobile.
            * **Main Content: Event List:** Displays events. Action buttons per event should be responsive (see Section VIII).
            * **Component(s):** `EventManagementDashboard`, `DashboardStatsCards`, `EventList`, `EventCreateForm`, `EventEditForm`, `EventTicketManagementView`.
            * **Data Source(s):** Supabase `events`, `tickets`.
            * **Mobile View Note:** Event lists use responsive tables or card views. Forms are full-screen or modal.

        * **Section/Sub-Tab: Reseller Management (Ticket Sellers)**
            * **Content & Components:** `ResellerManagementDashboard`, `InviteResellerForm`, `ResellerApprovalQueueList`.
            * **Data Source(s):** `profiles`, `promoter_reseller_assignments`.
            * **Mobile View Note:** Lists and forms must be mobile-friendly.

        * **Section/Sub-Tab: Scanner Management (Employees/Staff)**
            * **Content & Components:** `EmployeeManagementDashboard`, `InviteEmployeeForm`, `EmployeeApprovalQueueList`.
            * **Data Source(s):** `profiles`, `promoter_employee_assignments`.
            * **Mobile View Note:** Lists and forms must be mobile-friendly.

        * **Section/Sub-Tab: Analytics Hub**
            * **Content:** "Analytics will be available soon. (Planned: Sales Reports, Attendance & Check-in Reports, Audience Insights)"
            * **Mobile View Note (Future):** Charts and tables must be responsive. Consider simplified views or summaries for mobile.

        * **Section/Sub-Tab: Settings Hub**
            * **Content:** "Settings will be available soon. (Planned: Promoter Profile, Payment & Payouts, Notification Preferences, Team Management Defaults, API & Webhooks)"
            * **Mobile View Note (Future):** Forms should be single-column and easy to use on mobile.

---

### D. Reseller Role View (Ticket Seller)

*(Visibility of this dashboard/tab for a user is contingent on Promoter approval and role activation)*

1.  **Tab: "Reseller Dashboard"**
    * **Content & Components:** `TicketSellerSalesPage` or `ResellerDashboardContent`.
    * **Data Source(s):** `events`, `tickets`, `promoter_reseller_assignments`.
    * **Mobile View Note:** Ensure all sales data and event lists are easily viewable on mobile.

2.  **Tab: "My Tickets"**
    * **Content & Components:** `MyTicketsPage`.

---

### E. Employee Role View (Scanner/Staff)

*(Visibility of this dashboard/tab for a user is contingent on Promoter approval and role activation)*

1.  **Tab: "Scanner Dashboard" / "Event Staff Portal"**
    * **Content & Components:** `EmployeeDashboardContent`, `AssignedEventsList`, `ScanActivityLog`. The "Scan a Ticket" button (II.A) is the primary scan interaction.
    * **Data Source(s):** `events`, `promoter_employee_assignments`, `tickets`.
    * **Mobile View Note:** This dashboard should be highly optimized for quick mobile use.

2.  **Tab: "My Tickets"**
    * **Content & Components:** `MyTicketsPage`.

---

## VI. Handling Users with Multiple Roles

* **Additive Tabs:** Users see tabs for all *approved and active* roles. Navigation must adapt responsively.
* **Clear Navigation:** `UnifiedDashboard` tabs should be distinct.
* **Data Scoping:** Data within each role's section must be correctly scoped.

---

## VII. Implementation Guidance Summary (Reiterating Resource Prioritization)

* **Resource Prioritization (CRITICAL):** (As previously detailed - reuse tables and code).
* **Robust Role Detection & Approval Flow:** (As previously detailed).
* **Conditional Rendering:** Based on *active and approved* roles.
* **Logical Separation:** Maintain clear distinctions in functionality.
* **Mobile-First Design Thinking & Responsiveness:** (As detailed in Core Principles and Section VIII).

---

## VIII. Responsive Design & Mobile UI Enhancements (NEW SECTION)

This section provides specific guidance for ensuring the entire platform is responsive and addresses common mobile UI issues.

### A. General Responsive Strategies for Navigation and Controls

* **Main Navigation Tabs (e.g., "My Tickets," "Promoter Hub"):**
    * **Desktop:** Standard horizontal tab layout.
    * **Mobile/Tablet:**
        * If few tabs, they might remain horizontal but with smaller text/padding.
        * If many tabs, consider a **scrollable horizontal tab bar** or collapsing them into a **dropdown menu ("More" tab)** or a **hamburger menu** that reveals them in a vertical list.
        * The "Promoter Hub" itself, with its internal sections (Event Management, Reseller Management, etc.), should use a secondary navigation pattern on mobile:
            * **Option 1 (Sub-Tabs):** The main "Promoter Hub" tab is selected, and then a secondary row of scrollable sub-tabs appears below it for "Event Mgmt," "Reseller Mgmt," etc.
            * **Option 2 (List/Accordion):** The "Promoter Hub" content area starts with a list of its sections, each tappable to navigate to that section's content, or use an accordion interface.
* **Buttons (e.g., "Edit," "Analytics," "Trash," "Manage Tickets" per event):**
    * **Desktop:** Can be displayed with text and icons side-by-side.
    * **Mobile/Tablet:**
        * If space is tight, use **icon-only buttons** with clear, universally understood icons. Tooltips (on hover for desktop, potentially on long-press for mobile if feasible, or ensure context is clear) can provide text labels.
        * Stack buttons vertically if multiple actions are present.
        * Consider a "kebab" (three vertical dots) or "meatball" (three horizontal dots) menu icon that, when tapped, reveals a dropdown/action sheet with these options. This is very common for lists of items on mobile.
* **Forms:**
    * All form inputs should be single-column on mobile.
    * Labels should typically be placed above their respective input fields for mobile clarity.
    * Ensure tap targets for inputs, checkboxes, radio buttons, and select dropdowns are adequately sized.
* **Tables (e.g., Event List, Ticket Lists, Analytics Data):**
    * **Avoid horizontal scrolling where possible on mobile.**
    * **Strategies:**
        * **Card-based layout:** Convert each table row into a "card" on mobile, displaying key information vertically.
        * **Responsive Tables:** Allow horizontal scrolling within the table if absolutely necessary, but ensure the most important columns are visible by default, or provide a mechanism to toggle column visibility.
        * **Reduced Columns:** Show fewer columns on mobile, with a link/button to "View Details" for the full data set.
* **Modals/Pop-ups:** Ensure modals are responsive, take up an appropriate amount of screen space on mobile (often full-screen or near full-screen), and have clear "close" buttons.

### B. Mobile Menu Styling (Addressing Transparency & Visibility)

* **Problem Statement:** The mobile menu (often a hamburger menu dropdown/flyout) is transparent, making its text content unreadable if there's content behind it.
* **Solution:**
    1.  **Solid Background Color:**
        * The primary container element for the mobile menu **must have a solid background color.**
        * **Recommendation:** A common choice is **white (`#FFFFFF`)** or a light shade of your app's primary/secondary color.
        * **CSS Example (Conceptual):**
            ```css
            .mobile-menu-container {
              background-color: #FFFFFF; /* Or your chosen solid color */
              /* Add padding, shadow, etc., as needed for styling */
              padding: 16px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Optional shadow for depth */
              position: fixed; /* Or absolute, depending on implementation */
              top: 0; /* Or from header height */
              left: 0;
              width: 80%; /* Or desired width */
              height: 100vh; /* Or auto */
              z-index: 1000; /* Ensure it's above other content */
              /* Transition for smooth open/close */
              transform: translateX(-100%); /* Initially off-screen */
              transition: transform 0.3s ease-in-out;
            }
            .mobile-menu-container.open {
              transform: translateX(0);
            }
            ```
    2.  **Text Contrast:**
        * Ensure the text color for menu items provides **sufficient contrast** against the new solid background. If the background is white, dark text (e.g., dark grey, black, or your app's primary dark color) is appropriate.
        * **CSS Example (Conceptual):**
            ```css
            .mobile-menu-item a, .mobile-menu-item span {
              color: #333333; /* Dark text for a white background */
              display: block;
              padding: 12px 0;
              text-decoration: none;
            }
            ```
    3.  **Z-Index:**
        * Verify that the mobile menu container has a `z-index` value high enough to ensure it appears on top of all other page content when active.
    4.  **Overlay (Optional):**
        * Consider adding a semi-transparent dark overlay to the rest of the page content when the mobile menu is open. This helps focus the user on the menu and further improves its visibility.
        * **CSS Example (Conceptual):**
            ```css
            .page-overlay.active {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0.5);
              z-index: 999; /* Below menu, above page content */
            }
            ```

By implementing these responsive strategies and specifically fixing the mobile menu's background, the overall user experience will be significantly improved across all devices.



## **User Dashboard: "Events" Section UI/UX Redesign**

**Design Principles:**

* **Mobile-First:** All layouts prioritize ease of use and accessibility on mobile devices.  
* **Role-Centric:** The interface adapts to the user's primary role concerning events (Attendee, Promoter, Reseller).  
* **Action-Oriented:** Key actions for each role are prominent and easily accessible.  
* **Clear Navigation:** Simple and intuitive navigation within the events section and to specific event details.  
* **Component-Based:** Utilizing Shadcn/ui components and Tailwind CSS as per the existing stack.

**CRITICAL INSTRUCTIONS FOR CURSOR AI AGENT:**

* **NO DATABASE MODIFICATIONS:** This redesign assumes the existing Supabase database schema is correct and functional. **Do not make any changes to database tables, columns, or relationships.**  
* **REUSE EXISTING BACKEND LOGIC:** All data fetching (e.g., for events, tickets, user roles, analytics) and data mutations (e.g., creating events, inviting users, updating settings) **must utilize existing Supabase client calls, Edge Functions, hooks (like useEventForm.tsx, useAuth), and other backend functionalities.**  
* **AVOID DUPLICATION:** Before implementing any data handling, thoroughly check the existing codebase (including information in gemini.md where relevant) to find and reuse the current logic. The goal is to build a new UI on top of the working backend.  
* **FRONTEND FOCUS:** This markdown describes a **frontend redesign**. Changes should primarily be within React components, UI layout, navigation, and how data is presented and interacted with by the user.  
* **IDENTIFY GAPS CAREFULLY:** If the new UI requires data or functionality that does not appear to be available via existing backend mechanisms, **flag this for review**. Do not create new backend endpoints or database structures without explicit confirmation, as the user indicates most things are working and some UI elements might be for features not yet fully implemented on the backend.

### ---

**1\. Overall Dashboard Navigation (Context for "Events" Section)**

* **Component:** BottomNavigationBar.tsx  
  * **Description:** A fixed bottom navigation bar for mobile-first experience. This bar is the primary means of switching between major dashboard sections.  
  * **Tabs:** "Events", "Services", "Classes", "Stores" (and potentially a "Profile" or "Home" icon).  
  * **Behavior:** Tapping an icon navigates to the respective section. The "Events" tab will be the focus of the design below.  
  * **Styling:** Clean, with clear icons and labels. Active tab is visually highlighted.  
  * **Data Note:** This component is purely for frontend navigation.

### ---

**2\. "Events" Section Landing (app/dashboard/events/page.tsx)**

* **Logic:** This page will determine the user's primary event-related role (e.g., Promoter, Reseller, or default Attendee) and render the appropriate view.  
  * **Data Fetching:**  
    * **Reuse Existing Logic:** Utilize existing authentication context (e.g., useAuth or similar as indicated in gemini.md) to fetch the current user's profile and roles (profile.role). This information is critical for conditional rendering. **Do not create new methods for fetching user role information.**  
  * If a user has multiple roles, the design should prioritize their "highest" functional role view (Promoter \> Reseller \> Attendee).  
  * Handles conditional upgrades: If a user's role changes (e.g., Attendee invited to be a Reseller), this component should reflect this based on the updated role information fetched from the backend.

### ---

**3\. Attendee Event View (components/dashboard/events/AttendeeView.tsx)**

* **Primary Goal:** Quick access to scannable tickets for current/upcoming events.  
* **Layout:**  
  * **Default/Top Section:**  
    * **Component:** CurrentEventTicket.tsx  
      * **Display:** Prominently shows the QR code and corresponding code for the user's most current/upcoming event for which they have a ticket.  
      * **Details:** Event Name, Date, Time, Venue (briefly).  
      * **Action:** A clear button like "View Ticket Details".  
      * **Data Fetching:**  
        * **Reuse Existing Logic:** Fetch ticket and associated event data using existing Supabase queries/functions. Refer to gemini.md for clues on ticket management functionalities (e.g., "ticket\_types", "tickets", "event\_attendees" tables).  
    * If no current/upcoming event, display a message.  
  * **Secondary Section (Scrollable List):** "My Tickets" or "Upcoming Events"  
    * **Component:** AttendeeEventList.tsx  
      * **Display:** A list of other events the user has tickets for.  
      * Each item (e.g., using Shadcn Card): Event Name, Date, small event image thumbnail.  
      * **Data Fetching:**  
        * **Reuse Existing Logic:** As above, use existing backend calls to list user's tickets/events.  
  * **Component:** PastEventsList.tsx (Optional)  
    * **Data Fetching:**  
      * **Reuse Existing Logic:** Use existing backend calls to list user's past tickets/events.

### ---

**4\. Promoter Event View (components/dashboard/events/PromoterView.tsx)**

* **Primary Goal:** Manage created events, initiate scanning, and create new events.  
* **Layout \- Main Page:**  
  * **Header Section (Sticky or Prominent):**  
    * **Component:** PromoterActionsHeader.tsx  
      * **Button 1 (Primary Action):** Scan Tickets  
        * **Behavior:** Opens scanner interface.  
        * **Backend Interaction:** If ticket scanning involves backend validation, **ensure this uses the existing backend endpoint/logic** (e.g., an Edge Function referenced in gemini.md related to "ticket scanner" or "scanner access management").  
      * **Button 2 (Secondary Action):** Create New Event  
        * **Behavior:** Navigates to event creation form (app/dashboard/events/create/page.tsx).  
        * **Backend Interaction:** The form submission **must use the existing event creation logic** (e.g., useEventForm.tsx and its associated Supabase calls). **Do not implement new event creation pathways.**  
  * **Body Section: "My Created Events" (Scrollable List)**  
    * **Component:** PromoterEventList.tsx  
      * **Each Item (Component: EventCardPromoter.tsx using Shadcn Card):**  
        * Visual: Event Image. Text: Event Title, Date, key stats.  
        * Action Buttons: Edit Event, View Dashboard.  
        * **Data Fetching:**  
          * **Reuse Existing Logic:** Fetch the list of events created by the promoter using existing Supabase queries.  
      * **Behavior:** Tapping card navigates to Event Management Subpage.  
* **Layout \- Event Management Subpage (app/dashboard/events/\[eventId\]/promoter/page.tsx)**  
  * **Header:** Event Title, Date.  
  * **Content (Shadcn Tabs or Accordion):**  
    * **Tab 1: Overview/Analytics**  
      * **Data Fetching:**  
        * **Reuse Existing Logic:** Fetch analytics data for the specific event using existing backend functions. gemini.md mentions "event analytics" for promoters.  
    * **Tab 2: Manage Attendees/Tickets**  
      * **Data Fetching/Mutations:**  
        * **Reuse Existing Logic:** List attendees/tickets using existing queries. Any actions (resend tickets, manual check-in) **must use existing backend endpoints.**  
    * **Tab 3: Manage Team (Employees)**  
      * **Component:** TeamManagement.tsx  
      * Action: Invite Employee.  
      * **Data Fetching/Mutations:**  
        * **Reuse Existing Logic:** List team members and manage scanner access permissions using existing backend functions for "team management" or "scanner access management." Inviting employees **must use existing invitation logic.**  
    * **Tab 4: Manage Resellers**  
      * **Component:** ResellerManagement.tsx  
      * Action: Invite Reseller.  
      * **Data Fetching/Mutations:**  
        * **Reuse Existing Logic:** List resellers, their sales, and manage them using existing backend logic for "Reseller Functionality" (invitations, event-specific reseller management). Inviting resellers **must use existing invitation logic.**  
    * **Tab 5: Event Settings/Edit**  
      * **Backend Interaction:** Any edits **must use the existing event update functionalities.**

### ---

**5\. Reseller Event View (components/dashboard/events/ResellerView.tsx)**

* **Primary Goal:** Track sales and access promotional tools.  
* **Layout \- Main Page:**  
  * **Body Section: "Events I'm Promoting" (Scrollable List)**  
    * **Component:** ResellerEventList.tsx  
      * **Each Item (Component: EventCardReseller.tsx using Shadcn Card):**  
        * Visual: Event Image. Text: Event Title, Date. Stats: "Your Tickets Sold," "Your Earnings."  
        * Action Button: Access Tools & Stats.  
        * **Data Fetching:**  
          * **Reuse Existing Logic:** Fetch list of events the user is a reseller for, along with their sales stats, using existing backend queries. gemini.md mentions "Reseller Functionality" and "event-specific reseller management."  
  * **Layout \- Reseller Event Detail Subpage (app/dashboard/events/\[eventId\]/reseller/page.tsx)**  
    * **Section 1: Sales Performance**  
      * **Data Fetching:**  
        * **Reuse Existing Logic:** Display detailed sales/commission data using existing backend sources.  
    * **Section 2: Promotional Tools**  
      * **Component:** ResellerPromoTools.tsx  
      * Display: Unique Reseller Link, QR Code, Postable Images.  
      * **Data Fetching:**  
        * **Reuse Existing Logic:** Fetch any existing data/links for promotional tools associated with the reseller and event from the backend. If these tools (e.g., specific QR codes per reseller per event) are generated or stored via existing backend processes, use that.

### ---

**6\. Handling Role Transitions & Conditional Logic**

* **Data Source:** User roles and permissions **must be sourced from the existing backend authentication and profile management system** (e.g., profile.role from Supabase).  
* The UI will dynamically render views based on this backend-provided role information.  
* **Backend Dependency:** Role transitions (e.g., Attendee becoming a Reseller) are assumed to be handled by existing backend logic (e.g., promoter invites a user, and a backend function updates the invited user's roles/permissions). The frontend merely reflects these changes upon the next data fetch.

### ---

**7\. Suggested Shadcn/ui Components & General Styling:**

* (As per previous response \- this section primarily concerns frontend presentation)  
* Navigation: Bottom Navigation (custom), Tabs.  
* Content Display: Card, Avatar.  
* Actions: Button, DropdownMenu.  
* Modals/Dialogs: Dialog.  
* Forms: Input, Label, Checkbox.  
* Data Display: Table (mobile-responsive).  
* Notifications: Sonner.  
* Icons: lucide-react.  
* Layout: Tailwind CSS.

### ---

**8\. File Structure Suggestions (Conceptual for Cursor AI):**

* (As per previous response \- this section primarily concerns frontend structure)  
* components/dashboard/BottomNavigationBar.tsx  
* app/dashboard/events/page.tsx  
* components/dashboard/events/AttendeeView.tsx  
* components/dashboard/events/PromoterView.tsx  
* ... (and other components as previously listed)

---

**Concluding Reminder for Cursor AI Agent:**

The integrity of the existing, functional backend is paramount. All UI elements requiring data or performing actions **must interface with the pre-existing backend logic and database structures.** Refer to the current codebase and any available documentation (gemini.md) to identify these existing mechanisms. If a feature in this UI design seems to require new backend functionality or data not currently available, this should be flagged for discussion rather than implemented directly. This project is a **UI enhancement and reorganization**, not a backend overhaul.
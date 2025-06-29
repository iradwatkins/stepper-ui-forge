# **steppers.com Fullstack Architecture**

## **1. High-Level Architecture**

* **Structure:** Polyrepo (`steppers-frontend`, `steppers-backend`).
* **Backend:** Backend-as-a-Service (BaaS) first, using **Supabase**.
* **Frontend:** Vite + React PWA hosted on **Vercel** or **Netlify**.

## **2. Tech Stack**
* **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, React Router DOM.
* **State Management:** React Query (server), React Hook Form (forms), Zod (validation).
* **PWA:** `vite-plugin-pwa` for service worker generation and offline capabilities.

## **3. Database Schema**

The database schema will be implemented in Supabase (PostgreSQL) as detailed in the project documentation.
* **Core Tables:** `events`, `venues`, `organizers`, `ticket_types`, `tickets`, `orders`, `payments`, `seating_charts`, `team_members`, `check_ins`, `qr_codes`.

## **4. Core Services**
Backend logic will be implemented as Supabase Edge Functions or directly in the frontend using the Supabase SDK.
* **`EventService`**: Manages the 3-tier event system.
* **`PaymentService`**: Integrates with PayPal, Square, Cash App.
* **`TicketService`**: Handles ticket generation and QR code creation.
* **`SeatingService`**: Manages interactive seating charts.
* **`TeamService`**: Manages team roles and permissions.
* **`CheckInService`**: Powers the PWA check-in functionality.
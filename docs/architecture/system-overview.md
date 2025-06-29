# System Overview & Architecture

## High-Level Architecture

* **Structure:** Polyrepo (`steppers-frontend`, `steppers-backend`).
* **Backend:** Backend-as-a-Service (BaaS) first, using **Supabase**.
* **Frontend:** Vite + React PWA hosted on **Vercel** or **Netlify**.

## Technology Stack

### Frontend Technologies
* **Framework:** React (latest stable version)
* **Build Tool:** Vite with SWC compilation
* **Language:** TypeScript
* **Styling:** Tailwind CSS with PostCSS and Autoprefixer
* **UI Components:** Shadcn/UI (leveraging Radix UI primitives)
* **Icons:** Lucide React
* **Routing:** React Router DOM

### State Management & Data
* **Server State:** React Query (TanStack Query)
* **Form Management:** React Hook Form
* **Client State:** React Context API (with Zustand/Jotai if needed)
* **Validation:** Zod schema validation
* **Utilities:** Class Variance Authority, clsx, Tailwind Merge
* **Dates:** date-fns

### Backend & Infrastructure
* **Primary BaaS:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
* **Custom Backend:** Node.js with Express.js (TypeScript) if needed
* **API Design:** RESTful APIs with clear versioning

### PWA Capabilities
* **PWA Plugin:** vite-plugin-pwa
* **Service Worker:** Workbox for caching strategies
* **Offline Support:** Background sync and offline-first data
* **Installation:** Browser-based PWA installation
* **Push Notifications:** Web Push API integration

## Architecture Principles

### Scalability
- Microservice-ready architecture with clear boundaries
- Horizontal scaling capabilities through BaaS
- CDN integration for static assets
- Efficient caching strategies

### Security
- Authentication through Supabase Auth
- Row-level security (RLS) in PostgreSQL
- Encrypted QR codes with time validation
- PCI DSS compliance for payment processing
- HTTPS everywhere with secure headers

### Performance
- Lazy loading of components and routes
- Code splitting for optimal bundle sizes
- Image optimization and compression
- Database query optimization
- Real-time updates with minimal overhead

### Reliability
- Offline-first PWA architecture
- Graceful degradation for network issues
- Comprehensive error handling
- Data backup and recovery strategies
- Health monitoring and alerting
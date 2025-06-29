# Technical Preferences for steppers.com
This document outlines specific technical preferences, preferred patterns, and technologies to
consider (or avoid) during the architecture and development of the steppers.com platform.
This complements the main PRD and will guide the Architect.
## I. Overall Architectural Approach
* **Repository Structure:** A **Polyrepo approach with two primary GitHub repositories** is
generally preferred:
1. One for the Frontend Application.
2. One for any Custom Backend Services (if needed beyond BaaS capabilities).
* **Service Architecture:**
* Primarily leverage a **Backend-as-a-Service (BaaS) like Supabase** for core backend
needs (Database, Auth, Storage, Serverless Functions).
* If dedicated backend services are required for complex logic not suitable for BaaS
serverless functions, these will reside in the separate backend repository, likely as a **Modular
Monolith** to begin with.
## II. Frontend Application (Frontend Repository)
* **Primary Framework & Build Tool:** **React** (latest stable version) using **Vite** (latest
stable version) as the build tool and development server. Utilize SWC for fast compilation.
* **Programming Language:** **TypeScript**
.
* **Styling:**
* **Tailwind CSS** (latest stable version) is the preferred utility-first CSS framework.
* Utilize **PostCSS** and **Autoprefixer**
.
* CSS Variables for theming (e.g., using a library like **Next Themes** if adaptable, or a
custom solution for light/dark modes).
* **UI Component Strategy:**
* **Shadcn/UI** (leveraging **Radix UI** primitives) is the preferred approach for UI
components.
* **Icons:** **Lucide React** or a similar comprehensive SVG icon library.
* **Routing:** **React Router DOM** (latest stable version) for client-side routing in Vite + React
applications. (If Next.js is chosen for a project, its built-in router would be used).
* **State Management & Data Fetching:**
* **Server State, Data Fetching & Caching:** **React Query (TanStack Query)** (latest stable
version).
* **Form State Management:** **React Hook Form** (latest stable version).
* **Client-Side Global State:** Start with **React's built-in Context API**
. If more complex
global client-side state management is needed, evaluate and implement a lightweight library like
**Zustand or Jotai**
.
* **Key Utility Libraries (Examples):**
* Schema Validation: **Zod**
.
* CSS Class Utilities: **Class Variance Authority, clsx, Tailwind Merge**
.
* Date Manipulation: **date-fns**
.
## III. Backend & Database
* **Primary Backend-as-a-Service (BaaS): Supabase** (or a similar comprehensive BaaS
platform offering PostgreSQL, Auth, Storage, Serverless Functions).
* **Custom Backend Services (Backend Repository - if needed):**
* **Language/Framework:** **Node.js with Express.js (using TypeScript)** is a strong default
for consistency with a TypeScript frontend and good performance for web APIs.
* **API Design (for custom backend services):** Prefer **RESTful APIs** with clear versioning.
## IV. Development Practices & Tooling
* **Version Control:** **Git** with **GitHub** (or preferred platform like GitLab/Bitbucket).
* **Code Quality:** **ESLint** (with TypeScript ESLint plugins) and **Prettier**
.
* **Testing:**
* Frontend: **Jest or Vitest** with **React Testing Library** (unit/integration).
**Playwright or
Cypress** (E2E).
* Backend: Jest or similar for Node.js/TypeScript.
* **CI/CD:** **GitHub Actions** (or chosen platform's CI/CD solution).
* **Hosting:**
* Frontend: Platforms like **Vercel, Netlify**
, or evaluate user's preferred hosting (e.g.,
Hostinger) for Vite/Node.js app compatibility.
* Backend (BaaS): Handled by BaaS provider.
* Custom Backend Services: Suitable cloud environment supporting Node.js (e.g., Docker
containers on chosen cloud).
## V. Technologies/Patterns to Actively AVOID
* (To be populated per project if specific technologies or patterns are identified as undesirable).
## VI. Other Preferences
* Strive for a cohesive stack, avoiding redundant tools.
* Ensure components and services are designed for easy integration and maintainability.
* Prioritize security best practices throughout the stack.
* Emphasize clear, well-documented code.
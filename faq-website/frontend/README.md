# FAQ Hive — Frontend Documentation

This directory contains the React SPA (Single Page Application) for the FAQ Hive (CS18) project. It is built for speed, responsiveness, and a highly polished user experience.

## Frontend Architecture

The frontend is bootstrapped with **Vite** and built using **React 18**. The application follows a component-centric architecture where state, logic, and presentation are cleanly separated.

### Routing Structure
Routing is handled by `react-router-dom`. The application differentiates between public (Guest) and private (Authenticated) spaces:

- **Public Routes:** `/`, `/faqs`, `/login`, `/register`. Guests can view published FAQs without barriers.
- **Protected Routes:** `/dashboard`, `/discussions`, `/wallet`, `/admin/*`. Handled by a `<ProtectedRoute>` wrapper that intercepts unauthorized access and redirects users to `/login`.

### State Management
- **Server State:** Handled heavily by **TanStack React Query**. Custom hooks (e.g., `useQueries.js`) manage fetching, caching, synchronization, and background updates of FAQs, Categories, and User Data.
- **Global UI State:** React Context API is used for system-wide states. For instance, `NotificationContext.jsx` provides global WebSocket notifications and unread badge counts across the app.
- **Local State:** Managed via standard `useState` and `useReducer` hooks inside individual components.

### Component Organization
- `src/pages/`: Contains route-level views (e.g., `Dashboard.jsx`, `AdminDashboard.jsx`).
- `src/components/`: Reusable, atomic UI components (e.g., `StatusBadge`, `Avatar`, `SearchBar`).
- `src/hooks/`: Custom React hooks extracting business logic (e.g., `useVoiceAssistant.js`).
- `src/utils/`: Pure utility functions (e.g., formatting "Pizza Slices", dynamic theme calculations).

## UI Libraries Used
- **Tailwind CSS:** Core utility-first styling.
- **Framer Motion:** For micro-interactions, layout transitions, and fluid animations.
- **Lucide React:** Consistent, scalable SVG iconography.
- **React Hot Toast:** For non-blocking, elegant toast notifications.

## Authentication Flow
The frontend expects a stateless JWT workflow:
1. The user authenticates via `/login`.
2. The server returns a JWT, which is stored in browser `localStorage`.
3. `axiosClient.js` utilizes an **Axios Interceptor** to automatically attach the `Authorization: Bearer <token>` header to all outgoing requests.
4. If a `401 Unauthorized` response is caught, the interceptor automatically clears the token and redirects the user to the login screen.

## WebSocket Integration
Real-time features (like live notifications when a Semantic Cluster merges or an FAQ is published) are powered by **Socket.IO**.
The `NotificationContext` establishes a singleton connection to the backend upon login, listens to specific events (like `new_notification`), and pushes updates directly into the UI state without polling.

## Theme System
The UI utilizes a sleek, dark-mode-first aesthetic known as **Glassmorphism**.
- **Utility Classes:** Heavy use of backdrop-filters (`backdrop-blur-md`), semi-transparent backgrounds (`bg-white/5`), and subtle borders to create depth.
- **Banned User Theme:** The system dynamically injects severe visual constraints (using `useBannedTheme.js` and `BannedUserBanner.jsx`) if the authenticated user's account is suspended.

## Build Instructions

### Prerequisites
Make sure you have Node.js installed.

### Development Server
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```
This will bundle the application and output static files into the `dist/` directory.

## Environment Variables
The application requires specific environment variables to function correctly. Create a `.env` file in the root of the `frontend/` directory:

```env
# The base URL of your backend API
VITE_API_URL=http://localhost:5000/api
```

## Accessibility Considerations
- **Semantic HTML:** Use of proper headings and landmark tags.
- **Voice Assistant:** An integrated Web Speech API allows users to navigate and query hands-free.
- **Focus Management:** Modals (e.g., `FAQPromotionModal`, `DeleteTicketModal`) manage focus trapping to ensure keyboard navigation remains within the active dialog.

## Troubleshooting Guide
- **Blank Screen on Load:** Check your console. Ensure `VITE_API_URL` is set correctly and the backend server is running.
- **WebSockets Failing:** Ensure your backend URL does not include trailing slashes and CORS is properly configured on the server side.
- **Tailwind Styles Missing:** Ensure you haven't removed `index.css` from `main.jsx`.

## Performance Optimizations
- **React Query Caching:** Stale times are configured aggressively to prevent redundant network requests.
- **Vite:** Esbuild provides incredibly fast HMR (Hot Module Replacement) and optimized chunking during the build step.
- **Icon Treeshaking:** Lucide icons are imported specifically to keep bundle sizes minimal.

# FAQ Hive — Backend Documentation

This directory contains the robust, AI-powered Node.js and Express backend that drives FAQ Hive (CS18). It manages user authentication, semantic clustering of FAQs, gamified reputation features, administrative tools, and real-time notifications.

## Backend Architecture

The backend follows an MVC-inspired architectural pattern tailored for RESTful APIs:
- **Routes:** Map incoming HTTP requests to specific controller functions.
- **Controllers:** Validate requests, handle HTTP logic, and format JSON responses.
- **Services:** Encapsulate complex business logic (e.g., AI integration, Expertise/Matching algorithms, WebSocket events) separate from HTTP concerns.
- **Models:** Define strictly typed Mongoose schemas for MongoDB interactions.

### Folder Structure
```text
backend/
├── controllers/       # Route handlers (authController.js, adminController.js, etc.)
├── middleware/        # Request interceptors (authMiddleware.js, etc.)
├── models/            # Mongoose schemas (User, FAQ, SemanticCluster, etc.)
├── routes/            # Express router definitions
├── scripts/           # Standalone utilities (e.g., seeding users)
├── services/          # Business logic (aiService.js, notification.service.js)
├── utils/             # Helper functions (embeddings, constants, audit logs)
├── seed_local.js      # Primary database seeding script
└── server.js          # Application entry point
```

## Database Schema Overview
The database relies on MongoDB and is designed around several core entities:
- **User:** Stores credentials, roles (`user`, `mentor`, `admin`), `pizzaSlices`, `spurtiPoints`, and suspension states.
- **FAQ:** Published, canonical questions and answers.
- **SemanticCluster:** Groupings of user questions that are semantically identical.
- **Submission:** A proposed answer to an unresolved SemanticCluster.
- **AuditLog:** Immutable records of administrative actions for compliance and tracking.

## Authentication & Authorization
Authentication is stateless, utilizing JSON Web Tokens (JWT).

- **Authentication System:** The `/api/auth/login` and `/api/auth/register` endpoints handle generating tokens and hashing passwords (via `bcryptjs`).
- **Authorization Roles:** Handled by `authMiddleware.js`.
  - `authMiddleware` ensures the user has a valid JWT.
  - `mentorMiddleware` restricts access to SMEs and Admins.
  - `adminMiddleware` restricts access exclusively to System Administrators.
- **Ban Checking:** The middleware automatically rejects requests if `req.user.bannedUntil` dictates the user is currently suspended.

## API Endpoint Documentation
While exhaustive documentation is best viewed via Postman/Swagger, core namespaces include:
- `/api/auth`: Registration, login, and user profile checks.
- `/api/faqs`: Fetching published FAQs, view counting, and category statistics.
- `/api/discussions`: Fetching semantic clusters, related queries, and participating in answers.
- `/api/admin`: Powerful administrative endpoints for deduplication, user banning, and deep analytics.
- `/api/notifications`: Marking notifications as read and fetching history.

## WebSocket Architecture
Real-time operations are powered by `Socket.io`. 
When a user connects, they authenticate their socket. The `notification.service.js` is globally initialized to dispatch targeted events (`io.to(userId).emit(...)`) when specific triggers occur:
- An SME approves an answer (Promoted to Golden Ticket).
- An admin merges a user's question into another cluster.
- A user receives Spurti Points or Pizza Slices.

## Services & Controllers
- **`aiService.js` / `beeService.js`:** Interfaces with the Groq API (Llama 3) to generate vector embeddings for incoming questions and draft "Consensus" answers based on community submissions.
- **`expertise.service.js`:** A routing service that identifies which Mentor/SME is best suited to review a specific category of questions.

## Middleware & Error Handling Strategy
- **Error Handling:** Synchronous errors are caught via standard try/catch blocks in controllers. Asynchronous errors route to a centralized `asyncHandler` (where applicable) and Express's global error middleware.
- **Logging Strategy:** `morgan` handles HTTP request logging, while critical administrative actions generate persistent entries in the `AuditLog` collection.

## Environment Variables
Create a `.env` file in the root of the `backend/` directory:
```env
PORT=5000
# Connection string for your MongoDB instance (local or Atlas)
MONGO_URI=mongodb://127.0.0.1:27017/ocfaq
# A strong cryptographic key for signing JWTs
JWT_SECRET=your_super_secret_jwt_key
# Required for AI Features (Clustering, Consensus)
GROQ_API_KEY=your_groq_api_key_here
```

## Database Setup & Seeding

### Seeding Instructions
To populate a fresh database with demo categories, FAQs, and mock users (e.g., `alice@infracon.com`):
```bash
node seed_local.js
node scripts/seedUsers.js
```
*Note: `seed_local.js` drops the `Category` and `FAQ` collections and regenerates them to ensure clean, normalized Category String matches.*

### Migration Instructions
Mongoose handles schema evolution fluidly. However, for specialized logic (like issuing initial default "Pizza Slices" to legacy accounts), the admin dashboard contains an explicit `/apply-migration` API endpoint.

## Deployment Guide
1. Ensure your MongoDB Atlas cluster allows incoming connections from your hosting provider.
2. Provide all environment variables to your provider (Render, AWS, Heroku).
3. Start the application:
   ```bash
   npm start
   ```

## Security Measures
- Secrets are never hardcoded. 
- Input parsing uses standard JSON middleware limits to prevent payload bloat.
- Passwords are salt-hashed locally.
- Administrative merges and deletions are guarded and explicitly logged in `AuditLogs`.

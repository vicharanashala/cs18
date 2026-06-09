# FAQ Hive: Comprehensive Product & Architecture Specification

**Document Purpose**: This document serves as the absolute blueprint for "FAQ Hive". It is detailed enough that a fresh engineering and product team could use it to replicate the exact capabilities, schemas, UI flows, and gamified economies of the platform from scratch.

---

## 1. Core Architecture & Tech Stack

The platform is a fully real-time, AI-integrated Single Page Application (SPA) utilizing the MERN stack.

### 1.1 Tech Stack
- **Frontend**: React (Vite bundler), TailwindCSS for styling, React Router DOM for routing.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (managed via Mongoose ORM).
- **AI / NLP Integrations**:
  - **OpenAI / Groq (Llama)**: Used for Retrieval-Augmented Generation (RAG) to power AI-generated answers and the integrated "Bee" Voice Assistant.
  - **Jina AI**: Used to generate vector embeddings of questions to power "Semantic Clustering", effectively grouping similar questions mathematically.
- **Real-Time Engine**: Socket.IO natively integrated into the Express server, handling instant push notifications across the client.

### 1.2 "3-Tier Caution" Design Philosophy
The codebase is structured around a strict internal caution system for developers:
- **🟢 Tier 1 (Safe)**: Pure UI components (React/Tailwind).
- **🟡 Tier 2 (Caution)**: Interlocking systems like AI routing and API responses. Changing these breaks the UI.
- **🔴 Tier 3 (Critical)**: Core security, Mongoose `pre('save')` hooks (like password hashing), and Socket listeners. Modifying these risks catastrophic failure.

---

## 2. User Personas & Permissions

The platform relies on a strict Role-Based Access Control (RBAC) model.

### 2.1 The "User" (Student / Employee)
- **Permissions**: Can raise tickets, search FAQs, view their wallet, interact with the Bee Voice Assistant, and track their reputation.
- **Abilities**: 
  - Submit general or personal tickets.
  - Upvote helpful answers.
  - Spend "Spurti Points" to raise high-priority "Golden Tickets".
  - Associated with an `institution` automatically extracted from their email domain.

### 2.2 The "Mentor" (Subject Matter Expert - SME)
- **Permissions**: Everything a User can do, plus category-specific privileges.
- **Abilities**:
  - Assigned specific expertise categories (`mentorCategories`) and tracks `categoryExpertise` (answers given, helpful votes, response time).
  - Can claim and resolve tickets routed to their category.
  - Earns higher reputation and points for accepted answers.

### 2.3 The "Admin"
- **Permissions**: Complete platform oversight.
- **Abilities**:
  - Access to the `/admin/intelligence` and `/admin/settings` dashboards.
  - Can permanently ban or temporarily suspend users, issue warnings, or mute them.
  - Reviews "Golden Tickets" and auto-generated "Semantic Clusters".
  - Promotes highly viewed, resolved clusters into static, canonical FAQs (`ContributedFAQ`).

---

## 3. The Ticketing Ecosystem

The platform does not treat all questions equally. It actively attempts to deflect, group, or prioritize queries based on user input and AI analysis.

### 3.1 Standard Tickets (`Ticket.js`)
- **Flow**: User submits question -> Assigned a `ticketNumber` -> Routed based on `category`.
- **Statuses**: `submitted` -> `under_review` -> `assigned` -> `admin_review` -> `resolved`.
- **Severity**: Automatically scored from 0 to 100.
- **Reference Mapping**: Linked polymorphically via `referenceId` to either `Submission` or `PersonalTicket`.

### 3.2 Personal Issues (`PersonalTicket.js` & `SolvedPersonalIssue.js`)
- **Flow**: Explicitly marked as "personal".
- **Privacy**: Bypasses the public AI semantic clustering engine entirely. Routed strictly to authorized Admins/HR, ensuring sensitive data is never used to train responses or shown to peers.

### 3.3 Golden Tickets (`GoldenTicket.js`)
- **Concept**: A paid, high-priority lane. 
- **Mechanic**: Users spend their hard-earned "Spurti Points" to mint a Golden Ticket. The amount of points spent dictates the `leaderboardWeight`.
- **Severity**: Tracked with a `severityScore` and `priorityLevel` (LOW, MODERATE, HIGH, URGENT, CRITICAL).
- **Review**: Admins review these first. If accepted, the issue is resolved immediately. If rejected (e.g., spam), the user loses the points and the ticket is closed (optionally with a ban).

### 3.4 AI Semantic Clustering (`SemanticCluster.js`)
- **The Deflection Engine**: When a user types a question, Jina AI converts it to a vector embedding. It searches the DB for existing open clusters with high cosine similarity.
- **Auto-Grouping**: If a user asks a similar question, the system adds their query as a `relatedQuery` and adds them as a `participant` (with `joinMethod: AUTO_CLUSTERED`).
- **AI Auto-Response**: The LLM generates and stores an `aiGeneratedAnswer`.
- **Boosting**: Clusters can be temporarily boosted (`boostedAt`, `boostedUntil`) for visibility.
- **Resolution**: A Mentor or Admin provides a human answer. All `participants` get a Socket.IO notification that their query was resolved.

---

## 4. Gamification, Economy & Reputation

To ensure high participation, FAQ Hive operates an internal economy.

### 4.1 Currency Types
1. **Pizza Slices (Micro-currency)**: Earned through micro-actions (e.g., upvotes, helpful answers).
2. **Spurti Points (Premium Currency)**: 
   - **Conversion Rate**: 6 Pizza Slices = 1 Spurti Point.
   - **Use Case**: Used exclusively to purchase Golden Tickets and "Boosts" for visibility.
3. **Reputation Score**: 
   - **Calculation**: `Math.floor(pizzaSlices / 6) * 10`. 
   - **Use Case**: Displayed on the user's profile and Leaderboard. Determines Mentor eligibility.

### 4.2 Badges, Milestones & Rewards
- The backend `notification.service.js` tracks user actions and pushes real-time events like `BADGE_EARNED`, `MILESTONE_REACHED`, `REPUTATION_INCREASED`, and `TOP_CONTRIBUTOR` to the frontend `/rewards` UI.

---

## 5. Real-Time Infrastructure & Analytics

The platform feels "alive" due to its comprehensive websocket integration and tracks deep analytics.

### 5.1 The Notification Service (`Notification.js`)
The backend acts as a factory, saving to MongoDB and instantly `emit`ting to user rooms (`user:${userId}`).
- **Event Triggers (Examples)**:
  - Ticket updates (`TICKET_ANSWERED`, `TICKET_RESOLVED`, `TICKET_MERGED`).
  - Gamification (`BADGE_EARNED`, `TOP_CONTRIBUTOR`).
  - Moderation (`TEMP_BAN`, `PERM_BAN`, `WARNING_ISSUED`, `MUTE_APPLIED`).
  - Engagement (`USER_JOINED_QUERY`, `QUERY_TRENDING`).

### 5.2 System Analytics
The system logs data continuously to optimize the AI and user experience:
- **`DeflectionAnalytics.js`**: Tracks how effectively the AI prevents redundant tickets.
- **`VoiceAnalytics.js`**: Monitors Bee Voice Assistant queries, token usage, latency, and success rates.
- **`SearchAnalytics.js`**: Captures search query metrics and success rates.

### 5.3 System Settings (`SystemSettings.js`)
- An admin-configurable singleton that manages global flags: `publicFAQEnabled`, `guestFAQSearchEnabled`, `guestAnalyticsTrackingEnabled`, `beeEnabled`, and the `beeSystemPrompt`.

---

## 6. Frontend UI / UX Architecture

The React frontend (`src/pages`) is divided into distinct zones:

### 6.1 Public/General Routes
- `/faqs` & `/faqs/:id` (`FAQListPage.jsx`, `FAQDetailPage.jsx`): The verified knowledge base.
- `/categories` (`CategoriesPage.jsx`): Browse FAQs by domain (IT, HR, etc).
- `/intern-directory` & `/intern-profile` (`InternDirectory.jsx`, `InternProfile.jsx`): Browse and view user profiles.

### 6.2 Protected User Routes
- `/dashboard` (`Dashboard.jsx`): The main hub. Shows active tickets, trending Semantic Clusters, and quick-actions.
- `/raise-ticket` (`RaiseTicket.jsx`): The form to submit a new issue. Triggers the AI similarity check "on-type".
- `/golden-ticket` (`GoldenTicket.jsx`): Premium UI where users bid Spurti Points to submit high-priority issues.
- `/wallet` (`Wallet.jsx`) & `/rewards` (`Rewards.jsx`): Ledgers for earned/spent Pizza Slices, Spurti Points, and earned badges.
- `/contribute` (`ContributeFAQ.jsx`): For users/mentors submitting standard FAQs.
- `/ticket-status` (`TicketStatusPage.jsx`): View detailed status of a submitted ticket.

### 6.3 Admin/Mentor Routes
- `/admin/*` (`AdminDashboard.jsx`, `AdminSettingsTab.jsx`): The Admin Dashboard. Features system settings, user moderation queues, and ticket resolution metrics.
- `/admin/intelligence` (`AdminIntelligencePage.jsx`): Specialized dashboard to monitor AI deflection rates, voice analytics, and search metrics.

---

## 7. Data Models (Schema Blueprint)

To replicate the database exactly, adhere to these structural requirements:

- **User**: Requires `email`, `password`, `role` (enum: user, mentor, admin), `pizzaSlices`, `spurtiPoints`, `reputation`, `institution`, `categoryExpertise` (Map), and `mentorCategories` array. Tracks suspensions, bans, and `goldenTicketCooldownUntil`.
- **Ticket**: Requires `ticketNumber`, `userId`, `status` enum, `severity` (0-100), `type` (general/personal), and `referenceId`.
- **SemanticCluster**: Requires `canonicalQuestion`, `context`, an array of `participants` (tracking `userId`, `joinedAt`, `joinMethod`), an array of `relatedQueries`, and `aiGeneratedAnswer`. Features scoring (`severityScore`, `priorityLevel`) and boost timestamps.
- **GoldenTicket**: Requires `title`, `context`, `spurtiSpent`, `severityScore`, `priorityLevel`, `status`, and virtual `leaderboardWeight`.
- **Notification**: Requires `userId`, `type` (from an exhaustive enum), `title`, `message`, `priority`, `metadata` (Mixed), `read` boolean, and `actionUrl`.
- **SystemSettings**: Singleton (`key: 'global'`) defining defaults like `defaultPizzaSlices` and feature flags like `beeEnabled` and `publicFAQEnabled`.
- **Analytics**: `DeflectionAnalytics`, `SearchAnalytics`, and `VoiceAnalytics` to log system efficacy.
- **Logs**: `ActivityLog`, `AuditLog`, and `ModerationLog` for admin oversight.

---

## 8. Step-by-Step API & AI Workflow Example

**Scenario: A user asks a redundant question.**
1. **Frontend**: User types "How to connect to office wifi?" in `/raise-ticket`.
2. **Backend Route**: Request hits `POST /api/intelligence/check-similarity` (or equivalent embeddings check).
3. **AI Service**: Jina AI converts the string to a vector. Backend queries MongoDB for `SemanticCluster`s with vectors close to this one using cosine similarity.
4. **Match Found**: The backend finds an open cluster titled "Office Wi-Fi Connection Issues".
5. **Action**: The backend returns the match to the frontend. The UI prompts: *"Did you mean this active discussion?"*
6. **User Confirmation**: User clicks "Yes".
7. **Database Update**: The backend adds the `userId` to the `participants` array (with `joinMethod: 'AUTO_CLUSTERED'`) and adds their raw text to `relatedQueries`. No new ticket is created.
8. **Notification**: `notification.service.js` emits a `QUERY_CLUSTERED` event to the user, redirecting their dashboard to the active discussion room.

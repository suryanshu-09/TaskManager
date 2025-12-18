# Exaqube React Native Hiring Challenge

**Offline-First Task Management Application**

## 1. Stack

Used:

- bun (package manager)
- react native, expo (framework)
- nativewind (styling)
- sqlite (local storage)
- clerk (authentication)
- custom hooks for state management and api calls

> [!WARNING]: Due to some backend error, even though i could signin, i could not sync the tasks

## 2. Build Process

- Build the crud functionality for tasks
- Add SQLite for offline storage
- Add clerk for authentication
- Manage the Data Syncing with custom hooks

## 3. Setup and Build Instructions

### Prerequisites

- **Node.js** (v18+) and **npm** or **bun** (recommended)
- **Expo CLI**: `npm install -g @expo/cli`
- **Android Studio** (for Android builds) or **Xcode** (for iOS builds)
- Physical device or emulator for testing

### Installation

1. **Clone and install dependencies:**

   ```bash
   git clone <repository-url>
   cd TaskManager
   bun install
   ```

2. **Environment setup:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server:**

   ```bash
   bun run start
   ```

4. **Run on device:**

   ```bash
   # Android (requires emulator or connected device)
   bun run android

   # iOS (requires macOS and Xcode)
   bun run ios
   ```

### Build Instructions

#### Development Builds

```bash
# Development build (requires Expo Go app)
bun run build:dev

# Development APK (requires dev server)
eas build --profile development
```

#### Production Builds

```bash
# Production APK (standalone, no dev server required)
bun run build:preview

# Production release (for app stores)
bun run build:prod
```

> **⚠️ Important**: Use `build:preview` for standalone APK testing. The `build:dev` profile creates development builds that require a local development server.

### Build Profiles

| Profile     | Use Case              | Requires Dev Server | Standalone |
| ----------- | --------------------- | ------------------- | ---------- |
| development | Debugging and testing | ✅ Yes              | ❌ No      |
| preview     | Beta testing and QA   | ❌ No               | ✅ Yes     |
| production  | App store release     | ❌ No               | ✅ Yes     |

## 4. Architecture Overview

### System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Native  │    │   SQLite DB      │    │   REST API       │
│   UI Layer      │◄──►│   (Local Storage)│◄──►│   (Remote Sync)  │
│                 │    │                  │    │                  │
│ • Components    │    │ • Tasks          │    │ • CRUD Ops       │
│ • Hooks         │    │ • Sync Metadata  │    │ • Auth           │
│ • Navigation   │    │ • Conflict Flags │    │                  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                       ┌──────────────────┐
                       │   Sync Engine    │
                       │                  │
                       │ • Conflict Res.  │
                       │ • Retry Logic    │
                       │ • Network Mgmt   │
                       └──────────────────┘
```

### Key Components

1. **Presentation Layer**: React Native components with NativeWind styling
2. **State Management**: Custom hooks (`useTasks`, `useSync`, `useNetwork`)
3. **Data Layer**: SQLite database with sync metadata
4. **Sync Engine**: Bidirectional sync with conflict resolution
5. **Network Layer**: HTTP client with authentication and error handling

### Data Flow

1. **User Action** → Component → Hook → Local DB
2. **Local DB** → Sync Engine → API (if online)
3. **API Response** → Sync Engine → Local DB → UI Update

### Technologies and Rationale

- **Expo Router**: File-based routing for React Native, simplifies navigation
- **SQLite**: Native database for reliable offline storage
- **Clerk**: Complete authentication solution with secure token management
- **Custom Sync**: Tailored sync engine for specific requirements
- **NativeWind**: Tailwind CSS for React Native, consistent styling

## 5. Project Structure

```
TaskManager/
├── app/                          # Navigation and screen routing
│   ├── (tabs)/                   # Tab-based navigation screens
│   │   ├── _layout.tsx          # Tab navigation layout configuration
│   │   ├── create.tsx           # Task creation screen
│   │   └── index.tsx            # Home/tasks list screen
│   ├── task/                    # Individual task screen
│   │   └── [id].tsx             # Dynamic task detail view
│   ├── _layout.tsx              # Root navigation layout
│   ├── index.tsx                # Landing/redirect screen
│   ├── sign-in.tsx              # User authentication login
│   └── sign-up.tsx              # User registration
├── assets/                      # Static application assets
│   ├── adaptive-icon.png       # App icon for Android
│   ├── favicon.png              # Web favicon
│   ├── icon.png                 # App icon
│   ├── logo.png                 # Application logo
│   └── splash.png               # App splash screen
├── components/                  # Reusable UI components
│   ├── header.tsx               # Application header component
│   ├── signout.tsx              # Sign out button component
│   ├── task-form.tsx            # Task creation/editing form
│   ├── task-item.tsx            # Individual task display component
│   └── task.tsx                 # Task wrapper/parent component
├── hooks/                       # Custom React hooks
│   ├── useNetwork.ts            # Network connectivity monitoring
│   ├── useSync.ts               # Data synchronization logic
│   └── useTasks.ts              # Task state management
├── lib/                         # Core application utilities
│   ├── api.ts                   # API communication layer
│   ├── auth.ts                  # Authentication utilities
│   ├── db.ts                    # Database connection and setup
│   ├── network.ts               # Network-related utilities
│   ├── sync.ts                  # Sync functionality
│   └── tasks.ts                 # Task CRUD operations
├── types/                       # TypeScript type definitions
│   └── task.ts                  # Task interface and types
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment variable template
├── .gitignore                   # Git ignore rules
├── app.json                     # Expo app configuration
├── babel.config.js              # Babel transpiler configuration
├── bun.lock                     # Bun package lock file
├── cesconfig.jsonc              # CES configuration (if used)
├── eas.json                     # Expo Application Services config
├── eslint.config.js             # ESLint linting rules
├── global.css                   # Global styles and CSS variables
├── keystore.json                # Security keys storage
├── metro.config.js              # Metro bundler configuration
├── nativewind-env.d.ts          # NativeWind type declarations
├── package.json                 # Project dependencies and scripts
├── prettier.config.js           # Prettier code formatting rules
├── test-db-init.js              # Database initialization for testing
├── tsconfig.json                # TypeScript compiler configuration
└── tailwind.config.js           # Tailwind CSS configuration
```

### Directory Explanations

- **`app/`**: Contains all navigation and screen components following Expo's file-based routing system
- **`assets/`**: Static images and icons used throughout the application
- **`components/`**: Reusable UI components that can be shared across different screens
- **`hooks/`**: Custom React hooks for managing state, API calls, and side effects
- **`lib/`**: Core business logic, database operations, and utility functions
- **`types/`**: TypeScript type definitions for type safety throughout the app
- **Configuration files**: Various config files for build tools, linters, and development environment

## 5. Environment Setup

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Configure your environment variables in the `.env` file:
   - `API_BASE_URL`: Your backend API endpoint
   - `DATABASE_NAME`: SQLite database name
   - `EXPO_PUBLIC_*`: Expo-specific public environment variables

3. The `.env` file is already gitignored to prevent committing sensitive credentials.

## 7. Environment Setup

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Configure your environment variables in the `.env` file:
   - `API_BASE_URL`: Your backend API endpoint
   - `DATABASE_NAME`: SQLite database name
   - `EXPO_PUBLIC_*`: Expo-specific public environment variables

3. The `.env` file is already gitignored to prevent committing sensitive credentials.

## 8. Offline Storage Strategy

### Database Schema

The application uses SQLite with the following task structure:

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('pending', 'completed')),
  lastUpdatedAt INTEGER NOT NULL,
  serverLastUpdatedAt INTEGER,
  syncStatus TEXT CHECK(syncStatus IN ('synced', 'pending', 'conflict')),
  locallyCreated INTEGER DEFAULT 0,
  locallyModified INTEGER DEFAULT 0,
  locallyDeleted INTEGER DEFAULT 0
);
```

### Sync Metadata

- **`syncStatus`**: Tracks synchronization state
  - `synced`: Task is in sync with server
  - `pending`: Local changes need to be synced
  - `conflict`: Conflict detected, requires resolution

- **Local Change Flags**:
  - `locallyCreated`: Task created locally, not yet on server
  - `locallyModified`: Local modifications need to be pushed
  - `locallyDeleted`: Task deleted locally, deletion needs to be synced

### Offline Operations

1. **Create**: Stored locally with `syncStatus = 'pending'`
2. **Update**: Marked as `locallyModified = 1`
3. **Delete**: Soft delete with `locallyDeleted = 1`
4. **Query**: Filter out deleted tasks (`locallyDeleted = 0`)

## 9. Sync and Conflict Resolution Approach

### Sync Strategy

The application implements **bidirectional synchronization** with the following algorithm:

1. **Push Changes** (local → server):
   - Sync newly created tasks
   - Push modified tasks with timestamp comparison
   - Delete tasks marked for removal

2. **Pull Changes** (server → local):
   - Fetch all tasks from server
   - Update local copies that aren't pending changes
   - Remove tasks deleted on server

### Conflict Resolution

**Current Strategy**: Last-Write-Wins based on `lastUpdatedAt` timestamp

```typescript
// Conflict resolution logic (lib/sync.ts:214-239)
if (localTask.lastUpdatedAt > serverTask.lastUpdatedAt) {
  // Local version wins, re-push with server timestamp
} else {
  // Server version wins, accept server changes
}
```

**Conflict Detection**:

- HTTP 409 response indicates stale update
- Missing tasks during sync indicate deletion conflicts
- Timestamp mismatches indicate concurrent modifications

### Retry Mechanism

- **Max Attempts**: 3 retries per sync operation
- **Backoff Strategy**: Exponential backoff with jitter
- **Error Classification**: Different retry delays for different error types

## 10. Trade-offs and Limitations

### Technical Trade-offs

| Decision                 | Benefit                                   | Limitation                                |
| ------------------------ | ----------------------------------------- | ----------------------------------------- |
| SQLite vs Remote DB      | Offline functionality, fast local queries | Limited scalability, eventual consistency |
| Last-Write-Wins          | Simple implementation, predictable        | Can lose data, no field-level merging     |
| Custom Sync vs Libraries | Tailored to specific needs, full control  | More maintenance, potential bugs          |
| Expo vs Native React     | Faster development, cross-platform        | Some limitations, larger bundle size      |

### Current Limitations

1. **Conflict Resolution**: Simplistic last-write-wins approach
2. **Scalability**: Full data sync on every connection
3. **Clock Synchronization**: Relies on device timestamps
4. **Error Recovery**: Limited handling of partial failures
5. **Data Validation**: Minimal client-side validation
6. **Testing**: Limited automated test coverage

### Performance Considerations

- **Memory Usage**: All tasks loaded into memory
- **Network Usage**: Full table scans on sync
- **Database**: Missing indexes for large datasets
- **Battery**: Continuous sync may impact battery life

## 11. Assumptions Made

### Backend Assumptions

1. **API Endpoints**:
   - `GET /tasks` - Returns all user tasks
   - `POST /tasks` - Creates new task
   - `PUT /tasks/{id}` - Updates existing task
   - `DELETE /tasks/{id}` - Deletes task
   - Returns HTTP 409 for stale updates

2. **Authentication**: Bearer token authentication
3. **Data Format**: JSON responses with specific structure
4. **Timestamps**: Unix millisecond timestamps

### Device Assumptions

1. **Network Connectivity**: Assumes connectivity detection works reliably
2. **Storage**: Assumes sufficient local storage for SQLite database
3. **Clock**: Device clocks are approximately synchronized
4. **Concurrency**: Single-threaded database operations

### User Behavior Assumptions

1. **Sync Frequency**: Users will sync when coming online
2. **Conflict Acceptance**: Users will accept last-write-wins resolution
3. **Offline Usage**: Users will primarily work with individual tasks
4. **Data Volume**: Users will maintain reasonable task counts (<10,000)

### Development Assumptions

1. **Team Size**: Small development team (1-3 developers)
2. **Timeline**: Rapid development cycle required
3. **Technical Debt**: Acceptable for MVP/hiring challenge
4. **Maintenance**: Team can handle custom sync implementation

> **Note**: These assumptions were made based on the context of a hiring challenge and may need reassessment for production deployment.

## 12. Bonus Features Implemented

- Pull Down Refresh to refresh the task list
- Search tasks by title

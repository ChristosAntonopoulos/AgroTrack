# Olive Lifecycle Platform

A comprehensive platform for managing olive cultivation through a biennial (2-year) lifecycle with repeatable annual operations.

## Architecture

The platform consists of three main components:

- **Backend API** (C# ASP.NET Core) - Core logic, data management, and business rules
- **Web Frontend** (React + TypeScript) - Browser-based management and planning
- **Mobile Application** (React Native + Expo) - Field execution and reporting

## Tech Stack

- **Backend**: ASP.NET Core 8.0, MongoDB, JWT Authentication
- **Frontend**: React 18, TypeScript, React Router
- **Mobile**: React Native, Expo, AsyncStorage for offline support

## Project Structure

```
AgroTrack/
├── backend/              # C# ASP.NET Core API
│   ├── OliveLifecycle.API/
│   ├── OliveLifecycle.Core/
│   ├── OliveLifecycle.Application/
│   ├── OliveLifecycle.Infrastructure/
│   └── OliveLifecycle.Common/
├── frontend/             # React Web Application
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       └── context/
└── mobile/               # React Native Mobile App
    └── src/
        ├── screens/
        ├── components/
        ├── services/
        └── utils/
```

## Getting Started

### Prerequisites

- .NET 8.0 SDK
- Node.js 18+
- MongoDB (local or remote)
- Expo CLI (for mobile development)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Update `appsettings.json` with your MongoDB connection string:
```json
{
  "MongoDB": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "OliveLifecycle"
  },
  "JWT": {
    "SecretKey": "YourSecretKeyHere-ChangeInProduction",
    "Issuer": "OliveLifecycleAPI",
    "Audience": "OliveLifecycleClients",
    "ExpirationMinutes": 60
  }
}
```

3. Restore packages and run:
```bash
dotnet restore
dotnet run --project OliveLifecycle.API
```

The API will be available at `https://localhost:7000` (or the port configured in `launchSettings.json`).

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```
REACT_APP_API_URL=http://localhost:7000
```

4. Start the development server:
```bash
npm start
```

### Mobile Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```
EXPO_PUBLIC_API_URL=http://localhost:7000
```

4. Start the Expo development server:
```bash
npm start
```

## Features

### Backend MVP
- ✅ User authentication and authorization (JWT)
- ✅ Field management (CRUD operations)
- ✅ Lifecycle engine (biennial cycle management)
- ✅ Task engine (task creation, assignment, status tracking)
- ✅ MongoDB integration with proper indexing

### Frontend MVP
- ✅ Authentication UI (login/register)
- ✅ Field management (list, create, edit, detail views)
- ✅ Protected routes
- ✅ API integration

### Mobile MVP
- ✅ Authentication screen
- ✅ Task list and execution screens
- ✅ Offline storage with AsyncStorage
- ✅ Sync queue for pending operations

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user

### Fields
- `GET /api/v1/fields` - Get all fields for authenticated user
- `POST /api/v1/fields` - Create new field
- `GET /api/v1/fields/{id}` - Get field by ID
- `PUT /api/v1/fields/{id}` - Update field
- `DELETE /api/v1/fields/{id}` - Delete field

### Lifecycle
- `GET /api/v1/fields/{fieldId}/lifecycle` - Get lifecycle for field
- `POST /api/v1/fields/{fieldId}/lifecycle/initialize` - Initialize lifecycle
- `POST /api/v1/fields/{fieldId}/lifecycle/progress` - Progress lifecycle

### Tasks
- `GET /api/v1/tasks` - Get tasks (with optional filters)
- `POST /api/v1/tasks` - Create new task
- `GET /api/v1/tasks/{id}` - Get task by ID
- `PUT /api/v1/tasks/{id}/status` - Update task status
- `POST /api/v1/tasks/{id}/evidence` - Add evidence to task
- `PUT /api/v1/tasks/{id}/assign` - Assign task to user

## Development

### Coding Standards

See `.cursorrules` files in each project directory for coding standards and best practices.

### Database

MongoDB collections:
- `users` - User accounts and authentication
- `fields` - Field metadata and information
- `lifecycles` - Lifecycle state per field
- `tasks` - Task templates and instances

## License

[Your License Here]

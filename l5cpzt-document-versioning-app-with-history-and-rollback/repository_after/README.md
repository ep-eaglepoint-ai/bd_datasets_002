# Document Versioning App

A full-stack web application for document versioning with history and rollback functionality.

**Tech Stack:** Django REST Framework (Backend) + Vue 3 (Frontend)

## Features

- ✅ User authentication (Register, Login, JWT-based access)
- ✅ Create, edit, delete, and view text documents
- ✅ Automatic version creation on every document update
- ✅ View version history for each document
- ✅ Roll back a document to any previous version (atomic transaction)
- ✅ Access control - users can only manage their own documents
- ✅ Modern, responsive UI with Vue 3

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- pip and npm

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Run migrations
python manage.py migrate

# Seed demo data (optional)
python manage.py seed_demo

# Start server
python manage.py runserver 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Start dev server
npm run dev
```

### Access the App

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api
- **Demo Login:** username=`demo`, password=`demo123`

## Docker Setup

```bash
docker compose up --build
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | User registration |
| POST | `/api/auth/login/` | Login (get JWT tokens) |
| POST | `/api/auth/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | Logout (blacklist token) |
| GET | `/api/auth/me/` | Get current user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents/` | List documents |
| POST | `/api/documents/` | Create document |
| GET | `/api/documents/{id}/` | Get document |
| PATCH | `/api/documents/{id}/` | Update document |
| DELETE | `/api/documents/{id}/` | Delete document |

### Versions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents/{id}/versions/` | List versions |
| GET | `/api/documents/{id}/versions/{vid}/` | Get version |
| POST | `/api/documents/{id}/versions/{vid}/rollback/` | Rollback |

## Running Tests

```bash
cd backend
python manage.py test documents.tests -v 2
```

## Project Structure

```
├── backend/
│   ├── config/          # Django settings
│   ├── accounts/        # User authentication
│   ├── documents/       # Document & version models
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios configuration
│   │   ├── components/  # Vue components
│   │   ├── router/      # Vue Router
│   │   ├── stores/      # Auth state
│   │   └── views/       # Page components
│   └── package.json
└── docker-compose.yml
```

## License

MIT

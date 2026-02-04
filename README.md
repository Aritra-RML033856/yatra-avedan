# TripFlow

A comprehensive travel request and management system with backend and frontend components.

## Project Structure

This is a monorepo containing:
- **backend/**: Node.js Express server handling API, authentication, trip management, and email services
- **frontend/**: React application for user interface and travel request workflows

## Features

- User authentication and authorization
- Travel request creation and approval workflow
- Airport database integration
- File upload for receipts and travel options
- Email notifications
- Analytics dashboard
- User and travel management interfaces

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Aritra-Bag/tripflow.git
   cd tripflow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:

   Backend: Create `backend/.env` with required configurations (database, email, etc.)

   Frontend: Configure API endpoints if needed.

4. Start the applications:

   Backend:
   ```bash
   cd backend
   npm run dev
   ```

   Frontend:
   ```bash
   cd frontend
   npm start
   ```

## Technologies

- **Backend**: Node.js, Express, TypeScript, PostgreSQL, JWT, email services
- **Frontend**: React, TypeScript, CSS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

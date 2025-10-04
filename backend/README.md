# Expense Reimbursement Backend

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from example:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_reimbursement
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000

MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads
```

4. Create PostgreSQL database:
```sql
CREATE DATABASE expense_reimbursement;
```

5. Run migrations:
```bash
npm run migrate
```

6. Start the server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000/api`

## API Documentation

See main README.md for complete API documentation.

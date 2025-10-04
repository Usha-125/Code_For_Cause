# Quick Setup Guide

Follow these steps to get the Expense Reimbursement System running on your machine.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** (optional) - [Download](https://git-scm.com/)

## Step-by-Step Setup

### 1. Database Setup

Open PostgreSQL command line (psql) or pgAdmin and run:

```sql
CREATE DATABASE expense_reimbursement;
```

### 2. Backend Setup

Open a terminal and navigate to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Mac/Linux
cp .env.example .env
```

Edit the `.env` file with your database credentials:

```env
PORT=5000
NODE_ENV=development

# Update these with your PostgreSQL credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_reimbursement
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD

JWT_SECRET=change-this-to-a-random-secret-key
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000

MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads
```

Run database migrations:

```bash
npm run migrate
```

You should see: ✅ Database migration completed successfully

Start the backend server:

```bash
npm run dev
```

You should see:
```
🚀 Server is running on port 5000
📝 Environment: development
🌐 API URL: http://localhost:5000/api
✅ Database connected successfully
```

**Keep this terminal open!**

### 3. Frontend Setup

Open a **NEW terminal** and navigate to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**Keep this terminal open too!**

### 4. Access the Application

Open your web browser and go to:

```
http://localhost:3000
```

## First Time Usage

### Create Your Company Account

1. Click **"Sign up"** on the login page
2. Fill in your details:
   - First Name & Last Name
   - Email & Password
   - Company Name
   - Select your Country (currency will auto-populate)
3. Click **"Create Account"**

You'll be automatically logged in as the **Admin** user!

### Add Your First Employee

1. Click **"Users"** in the sidebar
2. Click **"Add User"**
3. Fill in employee details:
   - Name and email
   - Password
   - Role: Employee or Manager
   - Assign a manager (optional)
4. Click **"Create User"**

### Create an Approval Rule

1. Click **"Approval Rules"** in the sidebar
2. Click **"Create Rule"**
3. Configure the rule:
   - Give it a name (e.g., "Standard Approval")
   - Choose rule type:
     - **Percentage**: Requires X% of approvers
     - **Specific**: Sequential approvers
     - **Hybrid**: Both percentage and specific
   - Check "Require manager approval first" if needed
   - Add approvers in sequence
   - Mark any approver as "Auto-approve" for instant approval
4. Click **"Create Rule"**

### Submit Your First Expense

1. Click **"Expenses"** in the sidebar
2. Click **"New Expense"** or **"Scan Receipt"**

**For Manual Entry:**
- Enter amount and currency
- Select category
- Add description
- Choose date
- Upload receipt (optional)
- Select approval rule (optional)
- Click "Create Expense"

**For OCR Scan:**
- Click "Scan Receipt"
- Upload a receipt image
- System will auto-extract details
- Review and submit

### Approve Expenses (Manager/Admin)

1. Click **"Approvals"** in the sidebar
2. You'll see all pending expenses
3. Click **"View"** to see details
4. Click **"Approve"** or **"Reject"**
5. Add comments (required for rejection)

## Common Issues & Solutions

### Backend won't start

**Error: "Database connection failed"**
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Ensure database `expense_reimbursement` exists

**Error: "Port 5000 already in use"**
- Change PORT in `.env` to another port (e.g., 5001)
- Update frontend proxy in `vite.config.js` if needed

### Frontend won't start

**Error: "Port 3000 already in use"**
- The terminal will ask if you want to use another port
- Type `y` and press Enter

**Error: "Cannot connect to backend"**
- Ensure backend is running on port 5000
- Check browser console for errors

### Database migration fails

**Error: "relation already exists"**
- Database tables already exist
- Either drop the database and recreate, or skip migration

```sql
DROP DATABASE expense_reimbursement;
CREATE DATABASE expense_reimbursement;
```

Then run `npm run migrate` again.

### OCR not working

- Ensure receipt image is clear and readable
- Supported formats: JPG, PNG
- OCR works best with printed receipts
- May take 10-30 seconds to process

## Testing the System

### Test Workflow

1. **As Admin:**
   - Create 2-3 employees
   - Create 1-2 managers
   - Assign employees to managers
   - Create approval rules

2. **As Employee:**
   - Submit an expense
   - Try OCR scanning with a receipt
   - Check expense status

3. **As Manager:**
   - Go to Approvals
   - Review pending expenses
   - Approve or reject with comments

4. **As Employee Again:**
   - Check expense history
   - See approval status and comments

## Default Credentials

After signup, you can create test users with these roles:

**Admin** (you created during signup)
- Full access to everything

**Manager** (create via Users page)
- Can approve expenses
- Can view team expenses

**Employee** (create via Users page)
- Can submit expenses
- Can view own expenses

## Production Deployment

For production deployment:

1. Update `.env` with production values
2. Set `NODE_ENV=production`
3. Use a strong `JWT_SECRET`
4. Configure proper database credentials
5. Set up SSL/HTTPS
6. Use environment variables for sensitive data
7. Build frontend: `npm run build`
8. Serve frontend build folder with a web server

## Need Help?

- Check the main README.md for detailed documentation
- Review API endpoints in README.md
- Check browser console for frontend errors
- Check terminal for backend errors

## Stopping the Application

To stop the servers:
- Press `Ctrl + C` in both terminal windows (backend and frontend)

To restart:
- Run `npm run dev` in both folders again

---

**Congratulations! 🎉**

Your Expense Reimbursement System is now running!

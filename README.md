# Expense Reimbursement System

A comprehensive expense reimbursement management system with multi-level approvals, OCR receipt scanning, and flexible approval workflows.

## Features

### 🔐 Authentication & User Management
- Auto-creation of company and admin user on first signup
- Role-based access control (Admin, Manager, Employee)
- Manager-employee relationship management
- Multi-currency support based on country selection

### 💰 Expense Management
- Submit expense claims with multiple currencies
- Automatic currency conversion to company's default currency
- Attach receipts (images/PDF)
- OCR-powered receipt scanning for automatic data extraction
- Expense categories management
- Track expense history and status

### ✅ Approval Workflows
- Multi-level sequential approvals
- Manager approval as first step (optional)
- Flexible approval rules:
  - **Percentage-based**: Requires X% of approvers to approve
  - **Specific approvers**: Sequential approval chain
  - **Hybrid**: Combination of both
  - **Auto-approve**: Specific users can instantly approve
- Real-time approval status tracking
- Comments and feedback on approvals/rejections

### 👥 Role-Based Permissions

#### Admin
- Create and manage users
- Assign roles and managers
- Configure approval rules
- Manage expense categories
- View all expenses
- Override approvals

#### Manager
- Approve/reject team expenses
- View team expense history
- Escalate per approval rules
- All expenses shown in company's default currency

#### Employee
- Submit expense claims
- Upload receipts or use OCR scanning
- View own expense history
- Track approval status

### 🌍 Multi-Currency Support
- Automatic currency detection based on country
- Real-time currency conversion using Exchange Rate API
- Display amounts in both original and company currency

### 📸 OCR Receipt Scanning
- Upload receipt images
- Automatic extraction of:
  - Merchant name
  - Date
  - Amount
  - Line items
  - Description

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** authentication
- **Tesseract.js** for OCR
- **Axios** for external API calls
- **Bcrypt** for password hashing

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **TailwindCSS** for styling
- **Lucide React** for icons
- **React Hot Toast** for notifications
- **Axios** for API calls
- **date-fns** for date formatting

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_reimbursement
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
```

5. Create PostgreSQL database:
```sql
CREATE DATABASE expense_reimbursement;
```

6. Run database migration:
```bash
npm run migrate
```

7. Start the server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create company and admin user
- `POST /api/auth/login` - User login
- `GET /api/auth/countries` - Get countries with currencies

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:userId` - Update user
- `DELETE /api/users/:userId` - Deactivate user
- `GET /api/users/managers` - Get all managers

### Expenses
- `GET /api/expenses` - Get expenses (filtered by role)
- `POST /api/expenses` - Create expense
- `POST /api/expenses/ocr` - Create expense from receipt (OCR)
- `GET /api/expenses/:expenseId` - Get expense details
- `PUT /api/expenses/:expenseId` - Update expense
- `DELETE /api/expenses/:expenseId` - Delete expense
- `GET /api/expenses/pending-approvals` - Get pending approvals
- `POST /api/expenses/:expenseId/approve` - Approve expense
- `POST /api/expenses/:expenseId/reject` - Reject expense

### Approval Rules
- `GET /api/approval-rules` - Get all approval rules
- `POST /api/approval-rules` - Create approval rule
- `GET /api/approval-rules/:ruleId` - Get approval rule
- `PUT /api/approval-rules/:ruleId` - Update approval rule
- `DELETE /api/approval-rules/:ruleId` - Delete approval rule

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:categoryId` - Update category
- `DELETE /api/categories/:categoryId` - Delete category

## Usage Guide

### First Time Setup

1. **Sign Up**: Visit `/signup` and create your company account
   - Enter your details
   - Select country (currency auto-detected)
   - You'll be created as the Admin user

2. **Add Users**: As Admin, go to Users page
   - Create employees and managers
   - Assign manager relationships

3. **Configure Approval Rules**: Go to Approval Rules
   - Create approval workflows
   - Set percentage thresholds or specific approvers
   - Enable manager approval if needed

4. **Add Categories**: Customize expense categories
   - Default categories are created automatically
   - Add more as needed

### Submitting Expenses (Employee)

1. Go to Expenses page
2. Click "New Expense" or "Scan Receipt"
3. For manual entry:
   - Fill in amount, currency, date
   - Add description and category
   - Upload receipt (optional)
4. For OCR:
   - Upload receipt image
   - System auto-extracts details
   - Review and submit

### Approving Expenses (Manager/Admin)

1. Go to Approvals page
2. View pending expenses
3. Click "View" to see details
4. Click "Approve" or "Reject"
5. Add comments (required for rejection)

## Database Schema

### Main Tables
- `companies` - Company information
- `users` - User accounts with roles
- `expenses` - Expense claims
- `expense_categories` - Expense categories
- `approval_rules` - Approval workflow rules
- `approval_rule_approvers` - Sequential approvers
- `approval_history` - Approval/rejection history
- `expense_line_items` - Receipt line items (OCR)

## External APIs

- **Countries API**: `https://restcountries.com/v3.1/all`
- **Exchange Rate API**: `https://api.exchangerate-api.com/v4/latest/{currency}`

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- SQL injection prevention with parameterized queries
- CORS configuration
- File upload validation

## Development

### Backend Development
```bash
cd backend
npm run dev  # Runs with nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Runs with Vite HMR
```

### Building for Production

Backend:
```bash
cd backend
npm start
```

Frontend:
```bash
cd frontend
npm run build
npm run preview
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists

### OCR Not Working
- Ensure Tesseract.js is properly installed
- Check image format (JPG, PNG supported)
- Verify image quality is good

### Currency Conversion Fails
- Check internet connection
- Exchange Rate API may have rate limits
- Fallback: amounts stored in original currency

## License

MIT

## Support

For issues and questions, please create an issue in the repository.

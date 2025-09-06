# FeeClub MVP Backend - Complete Setup Guide

## 🏗️ Architecture Overview

**FeeClub** is a secure, multi-tenant SaaS platform for Indian private schools to manage fee collection, built on Supabase with Row-Level Security (RLS) for data isolation.

### Technology Stack
- **Database**: PostgreSQL with Supabase
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **Authentication**: Supabase Auth with custom JWT claims
- **Payment Gateway**: Razorpay integration
- **Security**: Row-Level Security (RLS) for multi-tenancy

---

## 📊 Database Schema

### Core Tables
1. **`schools`** - School information (multi-tenant root)
2. **`admins`** - School administrators (linked to auth.users)
3. **`students`** - Student records with school isolation
4. **`fee_heads`** - Fee components (tuition, sports, lab, etc.)
5. **`fee_structures`** - Fee packages combining multiple heads
6. **`fee_structure_details`** - Junction table for heads & structures
7. **`student_fees`** - Assigned fees with payment tracking
8. **`payments`** - Payment transaction records
9. **`school_configurations`** - Encrypted school settings (API keys)
10. **`payment_intents`** - Razorpay order tracking
11. **`student_login_logs`** - Student authentication audit logs

### Security Features
- **Row-Level Security** on all tenant-specific tables
- **JWT-based access control** with custom claims
- **Encrypted configuration storage** for sensitive data
- **Audit logging** for student authentication

---

## 🔑 Authentication & Authorization

### Admin Users
- Stored in `auth.users` with app_metadata
- Custom claims: `school_id`, `full_name`, `role`
- RLS policies restrict access to own school data

### Student Authentication  
- Credential-based login (admission_number + date_of_birth)
- Custom JWT tokens with limited validity (24 hours)
- Student claims: `student_id`, `school_id`, `role: 'student'`

---

## 🚀 Edge Functions

### 1. `school-onboarding`
**Purpose**: Creates new school + first admin user
```typescript
POST /functions/v1/school-onboarding
{
  "schoolName": "Modern Scholars Academy",
  "city": "Jaipur", 
  "state": "Rajasthan",
  "adminEmail": "principal@school.edu",
  "adminPassword": "secure_password",
  "adminFullName": "Dr. Principal Name",
  "adminRole": "Principal"
}
```

### 2. `student-login`
**Purpose**: Authenticates students and returns custom JWT
```typescript
POST /functions/v1/student-login
{
  "schoolId": "school-uuid",
  "admissionNumber": "MSA-101",
  "dateOfBirth": "2010-05-15"
}
```

### 3. `assign-fees-to-class`
**Purpose**: Bulk assigns fee structure to all students in a class
```typescript
POST /functions/v1/assign-fees-to-class
Authorization: Bearer <admin-jwt>
{
  "classOrGrade": "Grade 10",
  "feeStructureId": "structure-uuid",
  "dueDate": "2025-10-15",
  "overwriteExisting": false
}
```

### 4. `razorpay-initiate`
**Purpose**: Creates Razorpay payment order with school-specific keys
```typescript
POST /functions/v1/razorpay-initiate
Authorization: Bearer <jwt-token>
{
  "studentFeeId": "fee-uuid",
  "amount": 50000.00,
  "currency": "INR"
}
```

### 5. `razorpay-verify`
**Purpose**: Webhook + direct verification for payment completion
```typescript
// Direct verification
POST /functions/v1/razorpay-verify
{
  "razorpayOrderId": "order_id",
  "razorpayPaymentId": "pay_id",
  "razorpaySignature": "signature"
}
```

---

## 📁 File Structure

```
supabase/
├── migrations/
│   ├── 20250904000001_create_feeclub_schema.sql
│   ├── 20250904000002_implement_rls_policies.sql
│   ├── 20250904000003_seed_demo_data.sql
│   ├── 20250904000004_add_student_login_logs.sql
│   └── 20250904000005_add_payment_intents.sql
├── functions/
│   ├── _shared/
│   │   └── cors.ts
│   ├── school-onboarding/
│   │   └── index.ts
│   ├── student-login/
│   │   └── index.ts
│   ├── assign-fees-to-class/
│   │   └── index.ts
│   ├── razorpay-initiate/
│   │   └── index.ts
│   └── razorpay-verify/
│       └── index.ts
└── config.toml
```

---

## 🔧 Deployment Instructions

### Step 1: Initialize Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize project
supabase init

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID
```

### Step 2: Run Database Migrations
```bash
# Push all migrations to Supabase
supabase db push

# Or run individual migrations
supabase migration up
```

### Step 3: Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy

# Or deploy individual functions
supabase functions deploy school-onboarding
supabase functions deploy student-login
supabase functions deploy assign-fees-to-class
supabase functions deploy razorpay-initiate
supabase functions deploy razorpay-verify
```

### Step 4: Set Environment Variables
In Supabase Dashboard → Settings → Edge Functions:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

---

## 🧪 Testing

### Demo Data
The database is pre-seeded with:
- **Modern Scholars Academy** (Jaipur, Rajasthan)
- **2 Admin users** (Principal & Accountant)
- **5 Students** across different grades
- **Pre-configured fee structures** for different grades
- **Sample payment records**

### Test Scenarios
1. **School Onboarding**: Create a new school + admin
2. **Student Authentication**: Login with admission number + DOB
3. **Fee Assignment**: Assign fees to entire class
4. **Payment Flow**: Initiate → Verify Razorpay payment
5. **RLS Validation**: Ensure data isolation between schools

---

## 🔒 Security Considerations

### Data Isolation
- **Strict RLS policies** prevent cross-school data access
- **JWT claims validation** in all sensitive operations
- **Service role functions** for privileged operations

### Payment Security
- **School-specific Razorpay keys** stored encrypted
- **Signature verification** for all payment confirmations
- **Webhook validation** for automated payment processing

### Authentication
- **Strong password policies** for admin users
- **Limited JWT validity** for student sessions
- **Audit logging** for all authentication attempts

---

## 📈 Scaling Considerations

### Performance
- **Database indexes** on all foreign keys and query columns
- **Connection pooling** via Supabase
- **Edge Functions** for serverless scaling

### Monitoring
- **Built-in Supabase metrics** for database performance
- **Edge Function logs** for debugging
- **Payment audit trails** for financial compliance

---

## 🎯 Next Steps

1. **Frontend Integration**: Connect React/Next.js frontend
2. **Mobile App**: React Native or Flutter integration
3. **Notifications**: Email/SMS for payment reminders
4. **Reporting**: Advanced analytics and fee collection reports
5. **Multi-language**: Support for regional languages

---

## 📞 Support

For technical support or questions about the FeeClub backend:
- Review Edge Function logs in Supabase Dashboard
- Check RLS policies for access issues
- Validate JWT tokens for authentication problems
- Monitor payment webhooks for transaction issues

**Setup Complete! 🎉**

The FeeClub MVP backend is now fully configured with secure multi-tenancy, robust payment processing, and comprehensive fee management capabilities.
# FeeClub API Documentation

## 🔗 Base URL
```
https://kdzjvmhprgdflhvazzyf.supabase.co/functions/v1
```

## 🔑 Authentication
Most endpoints require authentication via JWT tokens in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

---

## 🏫 School Onboarding

### Create New School + Admin
Creates a new school and the first administrator user.

**Endpoint:** `POST /school-onboarding`

**Request Body:**
```json
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

**Response:**
```json
{
  "success": true,
  "message": "School onboarding completed successfully",
  "schoolId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "adminId": "11111111-1111-1111-1111-111111111111"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Missing required fields: schoolName, adminEmail"
}
```

---

## 🎓 Student Authentication

### Student Login
Authenticates a student using admission number and date of birth.

**Endpoint:** `POST /student-login`

**Request Body:**
```json
{
  "schoolId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "admissionNumber": "MSA-101",
  "dateOfBirth": "2010-05-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student authentication successful",
  "studentToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "studentInfo": {
    "id": "student-uuid",
    "fullName": "Rohan Verma",
    "class": "Grade 10",
    "admissionNumber": "MSA-101",
    "schoolName": "Modern Scholars Academy"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid admission number or date of birth"
}
```

---

## 💰 Fee Management

### Assign Fees to Class
Bulk assigns a fee structure to all students in a specific class.

**Endpoint:** `POST /assign-fees-to-class`
**Authentication:** Required (Admin JWT)

**Request Body:**
```json
{
  "classOrGrade": "Grade 10",
  "feeStructureId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "dueDate": "2025-10-15",
  "overwriteExisting": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully assigned fees to 2 students in Grade 10",
  "assignedCount": 2,
  "skippedCount": 0,
  "assignedStudents": [
    {
      "studentId": "student-uuid-1",
      "admissionNumber": "MSA-101",
      "fullName": "Rohan Verma",
      "totalDue": 82000.00
    },
    {
      "studentId": "student-uuid-2",
      "admissionNumber": "MSA-102", 
      "fullName": "Arjun Patel",
      "totalDue": 82000.00
    }
  ]
}
```

---

## 💳 Payment Processing

### Initiate Payment
Creates a Razorpay payment order for a student's fee.

**Endpoint:** `POST /razorpay-initiate`
**Authentication:** Required (Admin or Student JWT)

**Request Body:**
```json
{
  "studentFeeId": "fee-uuid",
  "amount": 50000.00,
  "currency": "INR",
  "notes": {
    "payment_for": "partial_tuition_fee"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "razorpayOrderId": "order_ABC123XYZ",
  "razorpayKeyId": "rzp_test_1234567890",
  "amount": 50000.00,
  "currency": "INR",
  "studentInfo": {
    "fullName": "Rohan Verma",
    "admissionNumber": "MSA-101",
    "class": "Grade 10"
  },
  "schoolInfo": {
    "schoolName": "Modern Scholars Academy"
  },
  "feeDetails": {
    "structureName": "Annual Fee 2025-26 (Grade 10)",
    "totalDue": 82000.00,
    "amountPaid": 0.00,
    "balanceDue": 82000.00
  }
}
```

### Verify Payment
Verifies a completed Razorpay payment and updates records.

**Endpoint:** `POST /razorpay-verify`

#### Direct Verification (from client)
**Request Body:**
```json
{
  "razorpayOrderId": "order_ABC123XYZ",
  "razorpayPaymentId": "pay_DEF456UVW",
  "razorpaySignature": "signature_hash_value"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and recorded successfully",
  "paymentId": "payment-record-uuid",
  "transactionId": "pay_DEF456UVW"
}
```

#### Webhook (from Razorpay)
**Headers:**
```
Content-Type: application/json
X-Razorpay-Event-Id: evt_123456789
```

**Request Body:**
```json
{
  "entity": "event",
  "account_id": "acc_12345678901234",
  "event": "payment.captured",
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_ABC123XYZ",
        "order_id": "order_DEF456UVW",
        "amount": 5000000,
        "status": "captured"
      }
    }
  },
  "created_at": 1609859600
}
```

---

## 📊 Database Queries (via Supabase Client)

### Get Student Fees
```sql
SELECT 
  sf.*,
  s.full_name,
  s.admission_number,
  s.class,
  fs.structure_name,
  (sf.total_due - sf.amount_paid) as balance_due
FROM student_fees sf
JOIN students s ON sf.student_id = s.id
JOIN fee_structures fs ON sf.structure_id = fs.id
WHERE sf.school_id = 'your-school-id'
ORDER BY s.class, s.admission_number;
```

### Get Payment History
```sql
SELECT 
  p.*,
  s.full_name,
  s.admission_number,
  fs.structure_name
FROM payments p
JOIN student_fees sf ON p.student_fee_id = sf.id
JOIN students s ON sf.student_id = s.id
JOIN fee_structures fs ON sf.structure_id = fs.id
WHERE p.school_id = 'your-school-id'
ORDER BY p.payment_date DESC;
```

### Fee Collection Summary
```sql
SELECT 
  s.class,
  COUNT(*) as total_students,
  COUNT(CASE WHEN sf.status = 'paid' THEN 1 END) as paid_count,
  COUNT(CASE WHEN sf.status = 'partially_paid' THEN 1 END) as partial_count,
  COUNT(CASE WHEN sf.status = 'unpaid' THEN 1 END) as unpaid_count,
  SUM(sf.total_due) as total_fees,
  SUM(sf.amount_paid) as collected_amount
FROM students s
LEFT JOIN student_fees sf ON s.id = sf.student_id
WHERE s.school_id = 'your-school-id'
GROUP BY s.class
ORDER BY s.class;
```

---

## 🔒 Row-Level Security

All database tables implement RLS policies:

### Admin Access
- Can only access data from their own school
- Cannot see other schools' data
- Verified via JWT `school_id` claim

### Student Access  
- Can only view their own fee records
- Cannot modify any data
- Verified via JWT `student_id` and `school_id` claims

### Example RLS Policy
```sql
CREATE POLICY "Users can access their own school's student data" 
ON public.students FOR ALL 
USING ((auth.get_claim('school_id')::UUID) = school_id);
```

---

## 🛠️ Error Handling

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `405` - Method Not Allowed
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Error description",
  "details": "Additional error details (if available)"
}
```

---

## 🧪 Testing with cURL

### School Onboarding
```bash
curl -X POST https://kdzjvmhprgdflhvazzyf.supabase.co/functions/v1/school-onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "schoolName": "Test School",
    "city": "Mumbai",
    "state": "Maharashtra",
    "adminEmail": "admin@test.school",
    "adminPassword": "secure123",
    "adminFullName": "Test Admin",
    "adminRole": "Principal"
  }'
```

### Student Login
```bash
curl -X POST https://kdzjvmhprgdflhvazzyf.supabase.co/functions/v1/student-login \
  -H "Content-Type: application/json" \
  -d '{
    "schoolId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "admissionNumber": "MSA-101",
    "dateOfBirth": "2010-05-15"
  }'
```

### Assign Fees (with admin token)
```bash
curl -X POST https://kdzjvmhprgdflhvazzyf.supabase.co/functions/v1/assign-fees-to-class \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "classOrGrade": "Grade 10",
    "feeStructureId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "dueDate": "2025-10-15"
  }'
```

---

## 📱 Frontend Integration

### React/Next.js Example
```typescript
// Initialize Supabase client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kdzjvmhprgdflhvazzyf.supabase.co',
  'your_anon_key'
)

// Student login
const loginStudent = async (schoolId: string, admissionNumber: string, dateOfBirth: string) => {
  const response = await fetch('/functions/v1/student-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId, admissionNumber, dateOfBirth })
  })
  
  const data = await response.json()
  if (data.success) {
    // Store student token for subsequent requests
    localStorage.setItem('studentToken', data.studentToken)
  }
  return data
}

// Initiate payment
const initiatePayment = async (studentFeeId: string, amount: number) => {
  const token = localStorage.getItem('studentToken')
  
  const response = await fetch('/functions/v1/razorpay-initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ studentFeeId, amount })
  })
  
  return response.json()
}
```

---

## 🔧 Configuration

### Environment Variables (Supabase Dashboard)
```env
SUPABASE_URL=https://kdzjvmhprgdflhvazzyf.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  
SUPABASE_JWT_SECRET=your_jwt_secret
```

### School Configuration (Database)
```sql
-- Add Razorpay keys for a school
INSERT INTO school_configurations (school_id, config_key, config_value) VALUES
('your-school-id', 'razorpay_key_id', 'rzp_live_your_key_id'),
('your-school-id', 'razorpay_key_secret', 'your_encrypted_secret');
```

---

## 📈 Monitoring & Logs

### Edge Function Logs
Access logs in Supabase Dashboard → Functions → Logs

### Database Logs  
Access logs in Supabase Dashboard → Logs Explorer

### Payment Monitoring
Monitor payment status in `payment_intents` and `payments` tables

---

## 🚀 Production Checklist

- [ ] Update Razorpay keys from test to live
- [ ] Set up proper CORS origins
- [ ] Configure webhooks in Razorpay Dashboard
- [ ] Set up monitoring and alerts
- [ ] Test all payment flows end-to-end
- [ ] Backup database regularly
- [ ] Monitor Edge Function performance
- [ ] Set up error logging and notifications

---

**API Documentation Complete! 🎉**
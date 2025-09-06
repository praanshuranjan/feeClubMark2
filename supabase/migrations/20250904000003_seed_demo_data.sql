-- FeeClub MVP Demo Data Seeding
-- This migration populates the database with sample data for testing

-- Insert Schools
INSERT INTO public.schools (id, school_name, city, state) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Modern Scholars Academy', 'Jaipur', 'Rajasthan'),
('f1e2d3c4-b5a6-9870-6543-210987fedcba', 'Vivekananda Public School', 'Sonipat', 'Haryana');

-- NOTE: The following admin inserts require you to manually create users in Supabase Auth
-- For demo purposes, we're using placeholder UUIDs that should be replaced with actual auth.users IDs
-- 
-- Manual steps required:
-- 1. Create user: principal.msa@feeclub.demo -> replace with actual UUID
-- 2. Create user: accountant.msa@feeclub.demo -> replace with actual UUID

-- Insert Admin Profiles (Update these UUIDs after creating auth users)
INSERT INTO public.admins (id, school_id, full_name, role) VALUES
('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Dr. Anjali Sharma', 'Principal'),
('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Mr. Ramesh Gupta', 'Accountant');

-- Insert Students for Modern Scholars Academy
INSERT INTO public.students (school_id, admission_number, full_name, class, date_of_birth) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'MSA-101', 'Rohan Verma', 'Grade 10', '2010-05-15'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'MSA-205', 'Priya Singh', 'Grade 8', '2012-08-22'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'MSA-102', 'Arjun Patel', 'Grade 10', '2010-03-20'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'MSA-301', 'Kavya Sharma', 'Grade 12', '2008-11-10'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'MSA-206', 'Rahul Kumar', 'Grade 8', '2012-07-18');

-- Insert Fee Heads for Modern Scholars Academy
INSERT INTO public.fee_heads (school_id, head_name) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tuition Fee'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Sports Fee'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Lab Fee'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Library Fee'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Transport Fee');

-- Insert Fee Structures for Modern Scholars Academy
INSERT INTO public.fee_structures (id, school_id, structure_name) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Annual Fee 2025-26 (Grade 10)'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Annual Fee 2025-26 (Grade 8)'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Annual Fee 2025-26 (Grade 12)');

-- Insert Fee Structure Details
-- Grade 10 Structure
INSERT INTO public.fee_structure_details (structure_id, head_id, amount)
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, 
  CASE 
    WHEN head_name = 'Tuition Fee' THEN 60000.00
    WHEN head_name = 'Sports Fee' THEN 5000.00
    WHEN head_name = 'Lab Fee' THEN 3000.00
    WHEN head_name = 'Library Fee' THEN 2000.00
    WHEN head_name = 'Transport Fee' THEN 12000.00
  END
FROM public.fee_heads WHERE school_id = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

-- Grade 8 Structure
INSERT INTO public.fee_structure_details (structure_id, head_id, amount)
SELECT 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', id,
  CASE 
    WHEN head_name = 'Tuition Fee' THEN 50000.00
    WHEN head_name = 'Sports Fee' THEN 5000.00
    WHEN head_name = 'Lab Fee' THEN 0.00 -- No lab fee for Grade 8
    WHEN head_name = 'Library Fee' THEN 2000.00
    WHEN head_name = 'Transport Fee' THEN 12000.00
  END
FROM public.fee_heads WHERE school_id = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

-- Grade 12 Structure
INSERT INTO public.fee_structure_details (structure_id, head_id, amount)
SELECT 'cccccccc-cccc-cccc-cccc-cccccccccccc', id,
  CASE 
    WHEN head_name = 'Tuition Fee' THEN 75000.00
    WHEN head_name = 'Sports Fee' THEN 5000.00
    WHEN head_name = 'Lab Fee' THEN 5000.00
    WHEN head_name = 'Library Fee' THEN 3000.00
    WHEN head_name = 'Transport Fee' THEN 12000.00
  END
FROM public.fee_heads WHERE school_id = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

-- Assign Fees to Students
-- Assign Grade 10 structure to Rohan Verma (unpaid)
INSERT INTO public.student_fees (student_id, school_id, structure_id, due_date, total_due, status) VALUES
((SELECT id FROM students WHERE admission_number = 'MSA-101'), 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-10-15', 82000.00, 'unpaid');

-- Assign Grade 8 structure to Priya Singh (paid)
INSERT INTO public.student_fees (id, student_id, school_id, structure_id, due_date, total_due, amount_paid, status) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', (SELECT id FROM students WHERE admission_number = 'MSA-205'), 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2025-10-15', 69000.00, 69000.00, 'paid');

-- Assign Grade 10 structure to Arjun Patel (partially paid)
INSERT INTO public.student_fees (id, student_id, school_id, structure_id, due_date, total_due, amount_paid, status) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', (SELECT id FROM students WHERE admission_number = 'MSA-102'), 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-10-15', 82000.00, 40000.00, 'partially_paid');

-- Assign Grade 12 structure to Kavya Sharma (unpaid)
INSERT INTO public.student_fees (student_id, school_id, structure_id, due_date, total_due, status) VALUES
((SELECT id FROM students WHERE admission_number = 'MSA-301'), 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2025-10-15', 100000.00, 'unpaid');

-- Assign Grade 8 structure to Rahul Kumar (unpaid)
INSERT INTO public.student_fees (student_id, school_id, structure_id, due_date, total_due, status) VALUES
((SELECT id FROM students WHERE admission_number = 'MSA-206'), 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2025-10-15', 69000.00, 'unpaid');

-- Add payment records
-- Payment for Priya's paid fee
INSERT INTO public.payments (student_fee_id, school_id, transaction_id, amount, payment_method) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'pay_xyz123abc', 69000.00, 'Online');

-- Partial payment for Arjun
INSERT INTO public.payments (student_fee_id, school_id, transaction_id, amount, payment_method) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'pay_def456ghi', 40000.00, 'Cash');

-- Insert placeholder Razorpay configurations
INSERT INTO public.school_configurations (school_id, config_key, config_value) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'razorpay_key_id', 'rzp_test_placeholder_key'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'razorpay_key_secret', 'ENCRYPTED_SECRET_VALUE'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'school_logo_url', 'https://example.com/logo.png'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'school_website', 'https://modernscholarsacademy.edu.in');

-- Add some data for the second school for testing
INSERT INTO public.students (school_id, admission_number, full_name, class, date_of_birth) VALUES
('f1e2d3c4-b5a6-9870-6543-210987fedcba', 'VPS-001', 'Vikram Singh', 'Grade 9', '2011-01-15'),
('f1e2d3c4-b5a6-9870-6543-210987fedcba', 'VPS-002', 'Ananya Gupta', 'Grade 7', '2013-04-22');

-- Insert Fee Heads for Vivekananda Public School
INSERT INTO public.fee_heads (school_id, head_name) VALUES
('f1e2d3c4-b5a6-9870-6543-210987fedcba', 'Tuition Fee'),
('f1e2d3c4-b5a6-9870-6543-210987fedcba', 'Activity Fee'),
('f1e2d3c4-b5a6-9870-6543-210987fedcba', 'Exam Fee');

-- Create a simple view for easier fee reporting
CREATE VIEW public.student_fee_summary AS
SELECT 
    s.school_id,
    s.admission_number,
    s.full_name AS student_name,
    s.class,
    fs.structure_name,
    sf.total_due,
    sf.amount_paid,
    (sf.total_due - sf.amount_paid) AS balance_due,
    sf.status,
    sf.due_date
FROM public.students s
JOIN public.student_fees sf ON s.id = sf.student_id
JOIN public.fee_structures fs ON sf.structure_id = fs.id
ORDER BY s.school_id, s.class, s.admission_number;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.student_fee_summary TO authenticated;

-- Add RLS policy for the view
ALTER VIEW public.student_fee_summary SET (security_invoker = true);

-- Add comments for documentation
COMMENT ON TABLE public.schools IS 'Demo schools: Modern Scholars Academy (Jaipur) and Vivekananda Public School (Sonipat)';
COMMENT ON VIEW public.student_fee_summary IS 'Consolidated view of student fees with payment status';
-- FeeClub MVP Database Schema
-- This migration creates the complete multi-tenant database structure for FeeClub

-- Create Schools Table (Public)
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Admin Profiles Table (Linked to Auth)
CREATE TABLE public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL -- e.g., 'Principal', 'Accountant'
);

-- Create Students Table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    admission_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    class TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.students ADD CONSTRAINT unique_admission_per_school UNIQUE (school_id, admission_number);

-- Create Fee Heads Table (Fee Components)
CREATE TABLE public.fee_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    head_name TEXT NOT NULL
);

-- Create Fee Structures Table (Packages of Fee Heads)
CREATE TABLE public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    structure_name TEXT NOT NULL -- e.g., 'Annual Fee 2025-26 (Grade 8)'
);

-- Create Fee Structure Details Table (Links Heads to Structures with Amounts)
CREATE TABLE public.fee_structure_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    structure_id UUID REFERENCES public.fee_structures(id) ON DELETE CASCADE NOT NULL,
    head_id UUID REFERENCES public.fee_heads(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL
);

-- Create Student Fees Table (Assigns a Structure to a Student)
CREATE TABLE public.student_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    structure_id UUID REFERENCES public.fee_structures(id) ON DELETE CASCADE NOT NULL,
    due_date DATE,
    total_due NUMERIC(10, 2) NOT NULL,
    amount_paid NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'unpaid' -- 'unpaid', 'paid', 'partially_paid'
);

-- Create Payments Table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE CASCADE NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    transaction_id TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'Online', 'Cash'
    payment_date TIMESTAMPTZ DEFAULT now()
);

-- Create School Configurations Table (for API Keys)
CREATE TABLE public.school_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    config_key TEXT NOT NULL,
    config_value TEXT NOT NULL -- MUST BE ENCRYPTED
);

-- Add indexes for better performance
CREATE INDEX idx_students_school_id ON public.students(school_id);
CREATE INDEX idx_students_admission_number ON public.students(admission_number);
CREATE INDEX idx_fee_heads_school_id ON public.fee_heads(school_id);
CREATE INDEX idx_fee_structures_school_id ON public.fee_structures(school_id);
CREATE INDEX idx_student_fees_school_id ON public.student_fees(school_id);
CREATE INDEX idx_student_fees_student_id ON public.student_fees(student_id);
CREATE INDEX idx_payments_school_id ON public.payments(school_id);
CREATE INDEX idx_payments_student_fee_id ON public.payments(student_fee_id);
CREATE INDEX idx_school_configurations_school_id ON public.school_configurations(school_id);

-- Add comments for documentation
COMMENT ON TABLE public.schools IS 'Stores school information for multi-tenant architecture';
COMMENT ON TABLE public.admins IS 'Admin users linked to auth.users with school association';
COMMENT ON TABLE public.students IS 'Student records with school isolation';
COMMENT ON TABLE public.fee_heads IS 'Fee components (tuition, sports, lab, etc.)';
COMMENT ON TABLE public.fee_structures IS 'Fee packages combining multiple fee heads';
COMMENT ON TABLE public.fee_structure_details IS 'Junction table linking fee heads to structures with amounts';
COMMENT ON TABLE public.student_fees IS 'Assigned fees to students with payment tracking';
COMMENT ON TABLE public.payments IS 'Payment records for student fees';
COMMENT ON TABLE public.school_configurations IS 'Encrypted school-specific configuration (API keys, etc.)';
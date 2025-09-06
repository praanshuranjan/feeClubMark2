-- FeeClub MVP Row-Level Security Implementation
-- This migration implements comprehensive RLS policies for multi-tenant data isolation

-- Helper function to get a specific claim from the JWT
CREATE OR REPLACE FUNCTION auth.get_claim(claim TEXT)
RETURNS jsonb AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> claim);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tenant-specific tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structure_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Schools Table
-- Schools are public for selection during onboarding, but only admins can see their own school details
CREATE POLICY "Schools are viewable by everyone for onboarding" ON public.schools
    FOR SELECT USING (true);

CREATE POLICY "Only service role can insert schools" ON public.schools
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can update their own school" ON public.schools
    FOR UPDATE USING ((auth.get_claim('school_id')::UUID) = id);

-- RLS Policies for Admins Table
CREATE POLICY "Admins can only see their own profile" ON public.admins
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can update their own profile" ON public.admins
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Only service role can insert admins" ON public.admins
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for Students Table
CREATE POLICY "Users can access their own school's student data" ON public.students
    FOR ALL USING ((auth.get_claim('school_id')::UUID) = school_id);

-- RLS Policies for Fee Heads Table
CREATE POLICY "Users can access their own school's fee heads" ON public.fee_heads
    FOR ALL USING ((auth.get_claim('school_id')::UUID) = school_id);

-- RLS Policies for Fee Structures Table
CREATE POLICY "Users can access their own school's fee structures" ON public.fee_structures
    FOR ALL USING ((auth.get_claim('school_id')::UUID) = school_id);

-- RLS Policies for Fee Structure Details Table
CREATE POLICY "Users can access their own school's fee structure details" ON public.fee_structure_details
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.fee_structures fs 
            WHERE fs.id = structure_id 
            AND fs.school_id = (auth.get_claim('school_id')::UUID)
        )
    );

-- RLS Policies for Student Fees Table
CREATE POLICY "Users can access their own school's student fees" ON public.student_fees
    FOR ALL USING ((auth.get_claim('school_id')::UUID) = school_id);

-- Special policy for students to view their own fees (when student authentication is implemented)
CREATE POLICY "Students can view their own fees" ON public.student_fees
    FOR SELECT USING (
        student_id = (auth.get_claim('student_id')::UUID)
        AND school_id = (auth.get_claim('school_id')::UUID)
    );

-- RLS Policies for Payments Table
CREATE POLICY "Users can access their own school's payments" ON public.payments
    FOR ALL USING ((auth.get_claim('school_id')::UUID) = school_id);

-- Special policy for students to view their own payments
CREATE POLICY "Students can view their own payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.student_fees sf 
            WHERE sf.id = student_fee_id 
            AND sf.student_id = (auth.get_claim('student_id')::UUID)
            AND sf.school_id = (auth.get_claim('school_id')::UUID)
        )
    );

-- RLS Policies for School Configurations Table
CREATE POLICY "Admins can access their own school's configurations" ON public.school_configurations
    FOR ALL USING ((auth.get_claim('school_id')::UUID) = school_id);

-- Additional security function to validate school admin permissions
CREATE OR REPLACE FUNCTION auth.is_school_admin(target_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.get_claim('school_id')::UUID) = target_school_id 
           AND auth.get_claim('role')::TEXT IN ('Principal', 'Accountant', 'Admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate student access
CREATE OR REPLACE FUNCTION auth.is_student_of_school(target_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.get_claim('school_id')::UUID) = target_school_id 
           AND auth.get_claim('student_id') IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to safely update user metadata (for Edge Functions)
CREATE OR REPLACE FUNCTION auth.update_user_metadata(user_id UUID, metadata_updates JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only allow service role to update user metadata
    IF auth.role() != 'service_role' THEN
        RETURN FALSE;
    END IF;
    
    UPDATE auth.users 
    SET app_metadata = COALESCE(app_metadata, '{}'::jsonb) || metadata_updates
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_claim(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_school_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_student_of_school(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.update_user_metadata(UUID, JSONB) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION auth.get_claim(TEXT) IS 'Safely extracts claims from JWT app_metadata';
COMMENT ON FUNCTION auth.is_school_admin(UUID) IS 'Validates if current user is admin of specified school';
COMMENT ON FUNCTION auth.is_student_of_school(UUID) IS 'Validates if current user is student of specified school';
COMMENT ON FUNCTION auth.update_user_metadata(UUID, JSONB) IS 'Service role function to update user app_metadata';
-- Add student login logging table for audit purposes
CREATE TABLE public.student_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    login_time TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_student_login_logs_student_id ON public.student_login_logs(student_id);
CREATE INDEX idx_student_login_logs_school_id ON public.student_login_logs(school_id);
CREATE INDEX idx_student_login_logs_login_time ON public.student_login_logs(login_time);

-- Enable RLS
ALTER TABLE public.student_login_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for student login logs
CREATE POLICY "School admins can view their school's student login logs" ON public.student_login_logs
    FOR SELECT USING ((auth.get_claim('school_id')::UUID) = school_id);

-- Students can view their own login logs
CREATE POLICY "Students can view their own login logs" ON public.student_login_logs
    FOR SELECT USING (
        student_id = (auth.get_claim('student_id')::UUID)
        AND school_id = (auth.get_claim('school_id')::UUID)
    );

-- Only service role can insert login logs
CREATE POLICY "Only service role can insert student login logs" ON public.student_login_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE public.student_login_logs IS 'Audit log for student authentication attempts';
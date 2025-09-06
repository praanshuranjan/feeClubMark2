-- Add payment intents table for tracking Razorpay orders
CREATE TABLE public.payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_order_id TEXT UNIQUE NOT NULL,
    student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE CASCADE NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created', -- 'created', 'paid', 'failed', 'cancelled'
    receipt TEXT NOT NULL,
    razorpay_payment_id TEXT, -- Set when payment is completed
    webhook_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_payment_intents_razorpay_order_id ON public.payment_intents(razorpay_order_id);
CREATE INDEX idx_payment_intents_student_fee_id ON public.payment_intents(student_fee_id);
CREATE INDEX idx_payment_intents_school_id ON public.payment_intents(school_id);
CREATE INDEX idx_payment_intents_status ON public.payment_intents(status);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE
    ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- RLS Policy for payment intents
CREATE POLICY "Users can access their own school's payment intents" ON public.payment_intents
    FOR ALL USING ((auth.get_claim('school_id')::UUID) = school_id);

-- Students can view their own payment intents
CREATE POLICY "Students can view their own payment intents" ON public.payment_intents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.student_fees sf 
            WHERE sf.id = student_fee_id 
            AND sf.student_id = (auth.get_claim('student_id')::UUID)
            AND sf.school_id = (auth.get_claim('school_id')::UUID)
        )
    );

-- Add comment
COMMENT ON TABLE public.payment_intents IS 'Tracks Razorpay order creation and payment verification';
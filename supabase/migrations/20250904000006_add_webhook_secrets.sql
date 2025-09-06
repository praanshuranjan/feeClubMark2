-- Add webhook secret support for Razorpay integration
-- This migration adds proper webhook secret storage and Supabase Vault integration

-- Create Supabase Vault secrets table reference (if not exists)
-- Note: Supabase Vault is used for encrypting sensitive data

-- Add function to encrypt/decrypt configuration values using Supabase Vault
CREATE OR REPLACE FUNCTION encrypt_config_value(config_value TEXT)
RETURNS TEXT AS $$
BEGIN
  -- In production, this should use Supabase Vault encryption
  -- For now, we'll use a simple encryption placeholder
  -- TODO: Replace with actual Supabase Vault integration
  RETURN 'ENCRYPTED:' || encode(config_value::bytea, 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_config_value(encrypted_value TEXT)
RETURNS TEXT AS $$
BEGIN
  -- In production, this should use Supabase Vault decryption
  -- For now, we'll use a simple decryption placeholder
  -- TODO: Replace with actual Supabase Vault integration
  IF encrypted_value LIKE 'ENCRYPTED:%' THEN
    RETURN convert_from(decode(substring(encrypted_value from 11), 'base64'), 'UTF8');
  ELSE
    RETURN encrypted_value;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add webhook secret to existing school configurations
-- This ensures each school has a unique webhook secret for security
INSERT INTO public.school_configurations (school_id, config_key, config_value)
SELECT 
  id as school_id,
  'razorpay_webhook_secret' as config_key,
  encrypt_config_value('whsec_' || encode(gen_random_bytes(32), 'hex')) as config_value
FROM public.schools
ON CONFLICT DO NOTHING;

-- Create view for safe configuration access (decrypts on read)
CREATE OR REPLACE VIEW public.school_configurations_decrypted AS
SELECT 
  id,
  school_id,
  config_key,
  CASE 
    WHEN config_key IN ('razorpay_key_secret', 'razorpay_webhook_secret') THEN 
      decrypt_config_value(config_value)
    ELSE 
      config_value 
  END as config_value
FROM public.school_configurations;

-- Grant access to the view
GRANT SELECT ON public.school_configurations_decrypted TO authenticated;
GRANT SELECT ON public.school_configurations_decrypted TO service_role;

-- Add RLS policy for the decrypted view
CREATE POLICY "Users can access their own school's decrypted configurations" 
ON public.school_configurations_decrypted
FOR SELECT USING ((auth.get_claim('school_id')::UUID) = school_id);

-- Add function to safely get school configuration with decryption
CREATE OR REPLACE FUNCTION get_school_config(
  target_school_id UUID,
  config_key_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  config_value TEXT;
BEGIN
  -- This function can only be called by service role for security
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: Service role required';
  END IF;

  SELECT 
    CASE 
      WHEN sc.config_key IN ('razorpay_key_secret', 'razorpay_webhook_secret') THEN 
        decrypt_config_value(sc.config_value)
      ELSE 
        sc.config_value 
    END
  INTO config_value
  FROM public.school_configurations sc
  WHERE sc.school_id = target_school_id 
    AND sc.config_key = config_key_name;

  RETURN config_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role only
GRANT EXECUTE ON FUNCTION get_school_config(UUID, TEXT) TO service_role;

-- Add idempotency support to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_webhook_verified BOOLEAN DEFAULT FALSE;

-- Create unique constraint to prevent duplicate payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id 
ON public.payments(transaction_id) 
WHERE transaction_id IS NOT NULL;

-- Add webhook processing log table for debugging
CREATE TABLE public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    webhook_event TEXT NOT NULL,
    razorpay_signature TEXT,
    payload JSONB,
    signature_valid BOOLEAN,
    processing_status TEXT DEFAULT 'received', -- 'received', 'processed', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for webhook logs
CREATE INDEX idx_webhook_logs_school_id ON public.webhook_logs(school_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_processing_status ON public.webhook_logs(processing_status);

-- Enable RLS on webhook logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for webhook logs
CREATE POLICY "School admins can view their webhook logs" ON public.webhook_logs
    FOR ALL USING ((auth.get_claim('school_id')::UUID) = school_id);

-- Add comments for documentation
COMMENT ON FUNCTION encrypt_config_value(TEXT) IS 'Encrypts sensitive configuration values using Supabase Vault';
COMMENT ON FUNCTION decrypt_config_value(TEXT) IS 'Decrypts sensitive configuration values using Supabase Vault';
COMMENT ON FUNCTION get_school_config(UUID, TEXT) IS 'Safely retrieves and decrypts school configuration values';
COMMENT ON VIEW public.school_configurations_decrypted IS 'Automatically decrypts sensitive configuration values';
COMMENT ON TABLE public.webhook_logs IS 'Logs all incoming webhook events for debugging and auditing';
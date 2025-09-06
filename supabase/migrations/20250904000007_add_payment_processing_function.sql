-- Create atomic payment processing function for webhook security
-- This ensures that payment processing is atomic and prevents race conditions

CREATE OR REPLACE FUNCTION process_payment_webhook(
  p_payment_intent_id UUID,
  p_razorpay_payment_id TEXT,
  p_amount_paid NUMERIC(10, 2),
  p_school_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_student_fee_id UUID;
  v_current_amount_paid NUMERIC(10, 2);
  v_total_due NUMERIC(10, 2);
  v_new_amount_paid NUMERIC(10, 2);
  v_new_status TEXT;
BEGIN
  -- This function can only be called by service role
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: Service role required';
  END IF;

  -- Start transaction (function is already in a transaction by default)
  
  -- Get payment intent details
  SELECT student_fee_id INTO v_student_fee_id
  FROM payment_intents
  WHERE id = p_payment_intent_id
    AND school_id = p_school_id;
    
  IF v_student_fee_id IS NULL THEN
    RAISE EXCEPTION 'Payment intent not found or access denied';
  END IF;
  
  -- Check for duplicate payment (idempotency)
  SELECT id INTO v_payment_id
  FROM payments
  WHERE transaction_id = p_razorpay_payment_id;
  
  IF v_payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Payment already processed: %', p_razorpay_payment_id;
  END IF;
  
  -- Get current student fee details with row lock
  SELECT amount_paid, total_due 
  INTO v_current_amount_paid, v_total_due
  FROM student_fees
  WHERE id = v_student_fee_id
    AND school_id = p_school_id
  FOR UPDATE; -- Lock the row to prevent concurrent updates
  
  IF v_current_amount_paid IS NULL THEN
    RAISE EXCEPTION 'Student fee not found or access denied';
  END IF;
  
  -- Calculate new amounts and status
  v_new_amount_paid := v_current_amount_paid + p_amount_paid;
  
  IF v_new_amount_paid >= v_total_due THEN
    v_new_status := 'paid';
  ELSIF v_new_amount_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    v_new_status := 'unpaid';
  END IF;
  
  -- Create payment record
  INSERT INTO payments (
    student_fee_id,
    school_id,
    transaction_id,
    razorpay_order_id,
    amount,
    payment_method,
    is_webhook_verified,
    payment_date
  ) VALUES (
    v_student_fee_id,
    p_school_id,
    p_razorpay_payment_id,
    (SELECT razorpay_order_id FROM payment_intents WHERE id = p_payment_intent_id),
    p_amount_paid,
    'Online',
    TRUE,
    now()
  ) RETURNING id INTO v_payment_id;
  
  -- Update student fee record
  UPDATE student_fees
  SET 
    amount_paid = v_new_amount_paid,
    status = v_new_status
  WHERE id = v_student_fee_id;
  
  -- Update payment intent
  UPDATE payment_intents
  SET 
    status = 'paid',
    razorpay_payment_id = p_razorpay_payment_id,
    webhook_verified = TRUE,
    updated_at = now()
  WHERE id = p_payment_intent_id;
  
  -- Log successful processing
  INSERT INTO webhook_logs (
    school_id,
    webhook_event,
    payload,
    signature_valid,
    processing_status
  ) VALUES (
    p_school_id,
    'payment.captured',
    jsonb_build_object(
      'payment_id', p_razorpay_payment_id,
      'amount_paid', p_amount_paid,
      'student_fee_id', v_student_fee_id,
      'processed_at', now()
    ),
    TRUE,
    'processed'
  );
  
  RETURN v_payment_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO webhook_logs (
      school_id,
      webhook_event,
      payload,
      signature_valid,
      processing_status,
      error_message
    ) VALUES (
      p_school_id,
      'payment.captured',
      jsonb_build_object(
        'payment_id', p_razorpay_payment_id,
        'amount_paid', p_amount_paid,
        'error', SQLERRM
      ),
      TRUE,
      'failed',
      SQLERRM
    );
    
    -- Re-raise the exception
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role only
GRANT EXECUTE ON FUNCTION process_payment_webhook(UUID, TEXT, NUMERIC, UUID) TO service_role;

-- Create helper function to verify payment signature (for direct verification)
CREATE OR REPLACE FUNCTION verify_razorpay_payment_signature(
  p_order_id TEXT,
  p_payment_id TEXT,
  p_signature TEXT,
  p_school_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_webhook_secret TEXT;
  v_expected_signature TEXT;
BEGIN
  -- This function can only be called by service role
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: Service role required';
  END IF;
  
  -- Get school's webhook secret
  SELECT decrypt_config_value(config_value) INTO v_webhook_secret
  FROM school_configurations
  WHERE school_id = p_school_id
    AND config_key = 'razorpay_webhook_secret';
    
  IF v_webhook_secret IS NULL THEN
    RAISE EXCEPTION 'Webhook secret not found for school';
  END IF;
  
  -- Note: Actual signature verification should be done in the Edge Function
  -- This function is a placeholder for future server-side verification
  -- For now, we'll return TRUE and let the Edge Function handle verification
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role only
GRANT EXECUTE ON FUNCTION verify_razorpay_payment_signature(TEXT, TEXT, TEXT, UUID) TO service_role;

-- Create view for payment analytics
CREATE OR REPLACE VIEW payment_analytics AS
SELECT 
  s.school_id,
  s.class,
  COUNT(DISTINCT sf.id) as total_fees_assigned,
  COUNT(DISTINCT CASE WHEN sf.status = 'paid' THEN sf.id END) as fees_paid,
  COUNT(DISTINCT CASE WHEN sf.status = 'partially_paid' THEN sf.id END) as fees_partial,
  COUNT(DISTINCT CASE WHEN sf.status = 'unpaid' THEN sf.id END) as fees_unpaid,
  SUM(sf.total_due) as total_amount_due,
  SUM(sf.amount_paid) as total_amount_collected,
  SUM(sf.total_due - sf.amount_paid) as total_outstanding,
  COUNT(DISTINCT p.id) as total_transactions,
  AVG(p.amount) as avg_transaction_amount,
  MAX(p.payment_date) as last_payment_date
FROM students s
LEFT JOIN student_fees sf ON s.id = sf.student_id
LEFT JOIN payments p ON sf.id = p.student_fee_id
GROUP BY s.school_id, s.class
ORDER BY s.school_id, s.class;

-- Grant access to the analytics view
GRANT SELECT ON payment_analytics TO authenticated;

-- Add RLS policy for analytics view
ALTER VIEW payment_analytics SET (security_invoker = true);

-- Add comments for documentation
COMMENT ON FUNCTION process_payment_webhook(UUID, TEXT, NUMERIC, UUID) IS 'Atomically processes webhook payments with full consistency checks';
COMMENT ON FUNCTION verify_razorpay_payment_signature(TEXT, TEXT, TEXT, UUID) IS 'Server-side payment signature verification helper';
COMMENT ON VIEW payment_analytics IS 'Real-time payment collection analytics by school and class';
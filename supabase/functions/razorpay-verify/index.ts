import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, errorResponse, successResponse } from '../_shared/cors.ts'

console.log("Razorpay Verify Payment Function v2.0.0 - Enhanced Webhook Security")

interface RazorpayWebhookPayload {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    payment: {
      entity: RazorpayPayment
    }
    order?: {
      entity: RazorpayOrder
    }
  }
  created_at: number
}

interface RazorpayPayment {
  id: string
  entity: string
  amount: number
  currency: string
  status: string
  order_id: string
  method: string
  amount_refunded: number
  captured: boolean
  description: string
  email: string
  contact: string
  notes: Record<string, string>
  created_at: number
}

interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: string
  created_at: number
}

interface VerifyPaymentRequest {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

interface VerifyPaymentResponse {
  success: boolean
  message: string
  paymentId?: string
  transactionId?: string
  error?: string
}

// Helper function to verify Razorpay webhook signature
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return computedSignature === signature
  } catch (error) {
    console.error('Webhook signature verification error:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // Check if this is a webhook or direct verification
    const contentType = req.headers.get('content-type') || ''
    const isWebhook = contentType.includes('application/json') && 
                     req.headers.get('x-razorpay-event-id')

    if (isWebhook) {
      // Handle Razorpay webhook
      return await handleWebhook(req, supabaseAdmin)
    } else {
      // Handle direct payment verification
      return await handleDirectVerification(req, supabaseAdmin)
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse(`Internal server error: ${error.message}`, 500)
  }
})

async function handleWebhook(req: Request, supabaseAdmin: any) {
  try {
    const rawPayload = await req.text()
    const webhookPayload: RazorpayWebhookPayload = JSON.parse(rawPayload)
    
    const signature = req.headers.get('x-razorpay-signature')
    if (!signature) {
      console.error('Missing webhook signature')
      return errorResponse('Missing webhook signature', 400)
    }
    
    console.log(`Received webhook: ${webhookPayload.event}`)

    // Extract order_id to find the school
    let orderId: string | null = null
    if (webhookPayload.event === 'payment.captured' && webhookPayload.payload.payment?.entity) {
      orderId = webhookPayload.payload.payment.entity.order_id
    }
    
    if (!orderId) {
      console.error('Could not extract order_id from webhook payload')
      return errorResponse('Invalid webhook payload')
    }
    
    // Find the payment intent to get school_id
    const { data: intentData, error: intentError } = await supabaseAdmin
      .from('payment_intents')
      .select('school_id, student_fee_id, amount')
      .eq('razorpay_order_id', orderId)
      .single()

    if (intentError || !intentData) {
      console.error('Payment intent not found for order:', orderId)
      return errorResponse('Payment intent not found')
    }
    
    const schoolId = intentData.school_id
    
    // Get school's webhook secret for verification
    const { data: webhookSecret, error: secretError } = await supabaseAdmin
      .rpc('get_school_config', {
        target_school_id: schoolId,
        config_key_name: 'razorpay_webhook_secret'
      })

    if (secretError || !webhookSecret) {
      console.error('Webhook secret not found for school:', schoolId)
      
      // Log the webhook attempt
      await supabaseAdmin.from('webhook_logs').insert({
        school_id: schoolId,
        webhook_event: webhookPayload.event,
        razorpay_signature: signature,
        payload: webhookPayload,
        signature_valid: false,
        processing_status: 'failed',
        error_message: 'Webhook secret not found'
      })
      
      return errorResponse('Webhook secret configuration error', 500)
    }
    
    // CRITICAL: Verify webhook signature
    const isValidSignature = await verifyWebhookSignature(
      rawPayload,
      signature,
      webhookSecret
    )
    
    // Log webhook attempt
    const webhookLogId = crypto.randomUUID()
    await supabaseAdmin.from('webhook_logs').insert({
      id: webhookLogId,
      school_id: schoolId,
      webhook_event: webhookPayload.event,
      razorpay_signature: signature,
      payload: webhookPayload,
      signature_valid: isValidSignature,
      processing_status: 'received'
    })
    
    if (!isValidSignature) {
      console.error('Invalid webhook signature for order:', orderId)
      
      await supabaseAdmin.from('webhook_logs')
        .update({
          processing_status: 'failed',
          error_message: 'Invalid webhook signature'
        })
        .eq('id', webhookLogId)
      
      return errorResponse('Invalid webhook signature', 400)
    }
    
    console.log('Webhook signature verified successfully')

    // Handle payment.captured event
    if (webhookPayload.event === 'payment.captured') {
      const payment = webhookPayload.payload.payment.entity
      
      console.log(`Processing payment.captured for payment: ${payment.id}`)
      
      // IDEMPOTENCY CHECK: Prevent duplicate processing
      const { data: existingPayment, error: checkError } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('transaction_id', payment.id)
        .single()

      if (existingPayment) {
        console.log(`Payment ${payment.id} already processed - webhook duplicate`)
        
        await supabaseAdmin.from('webhook_logs')
          .update({ processing_status: 'processed' })
          .eq('id', webhookLogId)
        
        return successResponse({ message: 'Payment already processed' })
      }
      
      // Find the payment intent using order_id
      const { data: fullIntentData, error: fullIntentError } = await supabaseAdmin
        .from('payment_intents')
        .select(`
          *,
          student_fees(*)
        `)
        .eq('razorpay_order_id', payment.order_id)
        .single()

      if (fullIntentError || !fullIntentData) {
        console.error('Payment intent not found for order:', payment.order_id)
        
        await supabaseAdmin.from('webhook_logs')
          .update({
            processing_status: 'failed',
            error_message: 'Payment intent not found'
          })
          .eq('id', webhookLogId)
        
        return errorResponse('Payment intent not found')
      }

      // Start database transaction for atomic updates
      const { data: transactionResult, error: transactionError } = await supabaseAdmin
        .rpc('process_payment_webhook', {
          p_payment_intent_id: fullIntentData.id,
          p_razorpay_payment_id: payment.id,
          p_amount_paid: payment.amount / 100, // Convert from paise to rupees
          p_school_id: schoolId
        })

      if (transactionError) {
        console.error('Payment processing transaction failed:', transactionError)
        
        await supabaseAdmin.from('webhook_logs')
          .update({
            processing_status: 'failed',
            error_message: `Transaction failed: ${transactionError.message}`
          })
          .eq('id', webhookLogId)
        
        return errorResponse('Payment processing failed', 500)
      }
      
      console.log(`Payment processed successfully: ${payment.id}`)
      
      await supabaseAdmin.from('webhook_logs')
        .update({ processing_status: 'processed' })
        .eq('id', webhookLogId)

      return successResponse({
        message: 'Payment processed successfully',
        paymentId: transactionResult
      })
    }

    // Handle other webhook events
    return successResponse({ message: 'Webhook received' })

  } catch (error) {
    console.error('Webhook error:', error)
    return errorResponse(`Webhook processing failed: ${error.message}`, 500)
  }
}

async function handleDirectVerification(req: Request, supabaseAdmin: any) {
  try {
    const requestData: VerifyPaymentRequest = await req.json()
    
    // Validate required fields
    const requiredFields = ['razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature']
    const missingFields = requiredFields.filter(field => !requestData[field])
    
    if (missingFields.length > 0) {
      return errorResponse(`Missing required fields: ${missingFields.join(', ')}`)
    }

    // Find the payment intent
    const { data: intentData, error: intentError } = await supabaseAdmin
      .from('payment_intents')
      .select(`
        *,
        student_fees (*),
        schools (
          school_configurations (
            config_key,
            config_value
          )
        )
      `)
      .eq('razorpay_order_id', requestData.razorpayOrderId)
      .single()

    if (intentError || !intentData) {
      return errorResponse('Payment intent not found')
    }

    // Get Razorpay secret for signature verification
    const config = intentData.schools.school_configurations.find(
      (c: any) => c.config_key === 'razorpay_key_secret'
    )

    if (!config) {
      return errorResponse('Razorpay configuration not found')
    }

    const razorpaySecret = config.config_value

    // Verify signature
    const isValidSignature = await verifyRazorpaySignature(
      requestData.razorpayOrderId,
      requestData.razorpayPaymentId,
      requestData.razorpaySignature,
      razorpaySecret
    )

    if (!isValidSignature) {
      return errorResponse('Invalid payment signature', 400)
    }

    // Check if payment is already processed
    if (intentData.status === 'paid') {
      return successResponse({
        message: 'Payment already processed',
        paymentId: intentData.razorpay_payment_id
      })
    }

    // Update payment intent
    const { error: updateIntentError } = await supabaseAdmin
      .from('payment_intents')
      .update({
        status: 'paid',
        razorpay_payment_id: requestData.razorpayPaymentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', intentData.id)

    if (updateIntentError) {
      console.error('Failed to update payment intent:', updateIntentError)
    }

    // Create payment record
    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        student_fee_id: intentData.student_fee_id,
        school_id: intentData.school_id,
        transaction_id: requestData.razorpayPaymentId,
        amount: intentData.amount,
        payment_method: 'Online',
        payment_date: new Date().toISOString()
      })
      .select('id')
      .single()

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError)
      return errorResponse('Failed to record payment')
    }

    // Update student fee record
    const newAmountPaid = intentData.student_fees.amount_paid + intentData.amount
    const totalDue = intentData.student_fees.total_due
    
    let newStatus = 'unpaid'
    if (newAmountPaid >= totalDue) {
      newStatus = 'paid'
    } else if (newAmountPaid > 0) {
      newStatus = 'partially_paid'
    }

    const { error: updateFeeError } = await supabaseAdmin
      .from('student_fees')
      .update({
        amount_paid: newAmountPaid,
        status: newStatus
      })
      .eq('id', intentData.student_fee_id)

    if (updateFeeError) {
      console.error('Failed to update student fee:', updateFeeError)
    }

    const response: VerifyPaymentResponse = {
      success: true,
      message: 'Payment verified and recorded successfully',
      paymentId: paymentRecord.id,
      transactionId: requestData.razorpayPaymentId
    }

    return successResponse(response)

  } catch (error) {
    console.error('Direct verification error:', error)
    return errorResponse(`Payment verification failed: ${error.message}`, 500)
  }
}

/* 
Usage Examples:

1. Webhook (from Razorpay):
POST /functions/v1/razorpay-verify
Content-Type: application/json
X-Razorpay-Event-Id: evt_123456789
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
        "status": "captured",
        ...
      }
    }
  },
  "created_at": 1609859600
}

2. Direct verification (from client):
POST /functions/v1/razorpay-verify
{
  "razorpayOrderId": "order_ABC123XYZ",
  "razorpayPaymentId": "pay_DEF456UVW", 
  "razorpaySignature": "signature_hash_value"
}

Response:
{
  "success": true,
  "message": "Payment verified and recorded successfully",
  "paymentId": "payment-record-uuid",
  "transactionId": "pay_DEF456UVW"
}
*/
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, errorResponse, successResponse } from '../_shared/cors.ts'

console.log("Razorpay Initiate Payment Function v2.0.0 - Enhanced Security")

interface PaymentInitiateRequest {
  studentFeeId: string
  amount?: number // Optional: if partial payment
  currency?: string // Default: INR
  notes?: Record<string, string>
}

interface PaymentInitiateResponse {
  success: boolean
  message: string
  razorpayOrderId: string
  razorpayKeyId: string
  amount: number
  currency: string
  studentInfo: {
    fullName: string
    admissionNumber: string
    class: string
  }
  schoolInfo: {
    schoolName: string
  }
  feeDetails: {
    structureName: string
    totalDue: number
    amountPaid: number
    balanceDue: number
  }
  error?: string
}

interface RazorpayOrderRequest {
  amount: number
  currency: string
  receipt: string
  notes?: Record<string, string>
}

interface RazorpayOrderResponse {
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

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get JWT token from headers
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Missing or invalid authorization header', 401)
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            authorization: authHeader
          }
        }
      }
    )

    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    const requestData: PaymentInitiateRequest = await req.json()
    
    // Validate required fields
    if (!requestData.studentFeeId) {
      return errorResponse('studentFeeId is required')
    }

    // Step 1: Get current user information
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return errorResponse('Authentication failed', 401)
    }

    const schoolId = user.app_metadata?.school_id
    const studentId = user.app_metadata?.student_id
    
    // This function can be called by both admins and students
    if (!schoolId) {
      return errorResponse('School ID not found in user metadata', 403)
    }

    // Step 2: Get student fee details with related information
    let query = supabaseClient
      .from('student_fees')
      .select(`
        id,
        student_id,
        school_id,
        total_due,
        amount_paid,
        status,
        students (
          admission_number,
          full_name,
          class
        ),
        fee_structures (
          structure_name
        ),
        schools (
          school_name
        )
      `)
      .eq('id', requestData.studentFeeId)
      .eq('school_id', schoolId)

    // If called by a student, ensure they can only access their own fees
    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: studentFeeData, error: feeError } = await query.single()

    if (feeError || !studentFeeData) {
      return errorResponse('Student fee record not found or access denied')
    }

    // Step 3: Calculate payment amount
    const balanceDue = studentFeeData.total_due - studentFeeData.amount_paid
    
    if (balanceDue <= 0) {
      return errorResponse('No balance due for this fee record')
    }

    const paymentAmount = requestData.amount 
      ? Math.min(requestData.amount, balanceDue)
      : balanceDue

    if (paymentAmount <= 0) {
      return errorResponse('Invalid payment amount')
    }

    // Step 4: Get school's Razorpay configuration securely
    // Use service role to access encrypted configuration
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

    // Get configuration using secure function that handles decryption
    const { data: keyIdResult, error: keyIdError } = await supabaseAdmin
      .rpc('get_school_config', {
        target_school_id: schoolId,
        config_key_name: 'razorpay_key_id'
      })

    const { data: keySecretResult, error: keySecretError } = await supabaseAdmin
      .rpc('get_school_config', {
        target_school_id: schoolId,
        config_key_name: 'razorpay_key_secret'
      })

    if (keyIdError || keySecretError || !keyIdResult || !keySecretResult) {
      console.error('Configuration fetch error:', { keyIdError, keySecretError })
      return errorResponse('Razorpay configuration not found for school')
    }

    const razorpayKeyId = keyIdResult
    const razorpayKeySecret = keySecretResult

    if (!razorpayKeyId || !razorpayKeySecret) {
      return errorResponse('Incomplete Razorpay configuration')
    }

    // Step 5: Create Razorpay order with secure validation
    const currency = requestData.currency || 'INR'
    const receipt = studentFeeData.id // Use student_fee_id as receipt for tracking
    
    // CRITICAL: Convert to paise (smallest currency unit for INR)
    const amountInPaise = Math.round(paymentAmount * 100)
    
    if (amountInPaise <= 0) {
      return errorResponse('Invalid payment amount calculated')
    }
    
    const razorpayOrderData: RazorpayOrderRequest = {
      amount: amountInPaise,
      currency: currency,
      receipt: receipt,
      notes: {
        student_fee_id: studentFeeData.id,
        student_id: studentFeeData.student_id,
        school_id: schoolId,
        admission_number: studentFeeData.students.admission_number,
        student_name: studentFeeData.students.full_name,
        fee_structure: studentFeeData.fee_structures.structure_name,
        ...requestData.notes
      }
    }
    
    console.log(`Creating Razorpay order for ₹${paymentAmount} (${amountInPaise} paise)`)

    // Create Razorpay order using API
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${razorpayAuth}`
      },
      body: JSON.stringify(razorpayOrderData)
    })

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text()
      console.error('Razorpay API error:', errorText)
      return errorResponse('Failed to create payment order', 500)
    }

    const razorpayOrder: RazorpayOrderResponse = await razorpayResponse.json()

    // Step 6: Store payment intent for verification later
    const { error: intentError } = await supabaseAdmin
      .from('payment_intents')
      .insert({
        razorpay_order_id: razorpayOrder.id,
        student_fee_id: studentFeeData.id,
        school_id: schoolId,
        amount: paymentAmount,
        currency: currency,
        status: 'created',
        receipt: receipt,
        created_at: new Date().toISOString()
      })

    if (intentError) {
      console.error('Failed to store payment intent:', intentError)
      return errorResponse('Failed to store payment intent')
    }
    
    console.log(`Payment intent stored: ${razorpayOrder.id} for fee ${studentFeeData.id}`)

    // Step 7: Prepare secure response (never expose secrets)
    const response: PaymentInitiateResponse = {
      success: true,
      message: 'Payment order created successfully',
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: razorpayKeyId, // Safe to expose (public key)
      amount: paymentAmount, // Amount in rupees for display
      currency: currency,
      studentInfo: {
        fullName: studentFeeData.students.full_name,
        admissionNumber: studentFeeData.students.admission_number,
        class: studentFeeData.students.class
      },
      schoolInfo: {
        schoolName: studentFeeData.schools.school_name
      },
      feeDetails: {
        structureName: studentFeeData.fee_structures.structure_name,
        totalDue: studentFeeData.total_due,
        amountPaid: studentFeeData.amount_paid,
        balanceDue: balanceDue
      }
    }
    
    // Log successful order creation (without sensitive data)
    console.log(`Payment order created successfully for student ${studentFeeData.students.admission_number}, amount: ₹${paymentAmount}`)

    return successResponse(response)

  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse(`Internal server error: ${error.message}`, 500)
  }
})

/* 
SECURE PAYMENT INITIATION - USAGE GUIDE

🔒 SECURITY FEATURES:
- Amount validation: Server calculates actual amount, client cannot manipulate
- Encrypted key storage: API keys retrieved securely from Supabase Vault
- Authentication required: Only authenticated users can initiate payments
- Receipt tracking: Uses student_fee_id as receipt for webhook verification

POST /functions/v1/razorpay-initiate
Authorization: Bearer <admin-or-student-jwt-token>
{
  "studentFeeId": "fee-uuid",
  "amount": 50000.00,          // Optional: for partial payments
  "currency": "INR",           // Optional: defaults to INR
  "notes": {
    "payment_for": "partial_tuition_fee"
  }
}

Response:
{
  "success": true,
  "message": "Payment order created successfully",
  "razorpayOrderId": "order_ABC123XYZ",
  "razorpayKeyId": "rzp_test_1234567890",  // Safe to expose (public)
  "amount": 50000.00,                       // Display amount in rupees
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

⚠️ IMPORTANT:
- razorpayKeySecret is NEVER sent to client
- Amount calculation is server-side only
- Client should use this data to open Razorpay checkout
- Payment verification happens via secure webhook
*/
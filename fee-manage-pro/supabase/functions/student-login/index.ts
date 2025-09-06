import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts'
import { corsHeaders, errorResponse, successResponse } from '../_shared/cors.ts'

console.log("Student Login Function v1.0.0")

interface StudentLoginRequest {
  schoolId: string
  admissionNumber: string
  dateOfBirth: string // YYYY-MM-DD format
}

interface StudentLoginResponse {
  success: boolean
  message: string
  studentToken?: string
  studentInfo?: {
    id: string
    fullName: string
    class: string
    admissionNumber: string
    schoolName: string
  }
  error?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
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

    const requestData: StudentLoginRequest = await req.json()
    
    // Validate required fields
    const requiredFields = ['schoolId', 'admissionNumber', 'dateOfBirth']
    const missingFields = requiredFields.filter(field => !requestData[field])
    
    if (missingFields.length > 0) {
      return errorResponse(`Missing required fields: ${missingFields.join(', ')}`)
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(requestData.dateOfBirth)) {
      return errorResponse('Date of birth must be in YYYY-MM-DD format')
    }

    // Step 1: Verify school exists
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id, school_name')
      .eq('id', requestData.schoolId)
      .single()

    if (schoolError || !schoolData) {
      return errorResponse('Invalid school ID')
    }

    // Step 2: Verify student credentials
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, class, admission_number, date_of_birth')
      .eq('school_id', requestData.schoolId)
      .eq('admission_number', requestData.admissionNumber)
      .eq('date_of_birth', requestData.dateOfBirth)
      .single()

    if (studentError || !studentData) {
      console.error('Student verification failed:', studentError)
      return errorResponse('Invalid admission number or date of birth')
    }

    // Step 3: Create student JWT token
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')
    if (!jwtSecret) {
      console.error('JWT secret not configured')
      return errorResponse('Authentication service unavailable', 500)
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    )

    // Create custom JWT for student with limited validity (24 hours)
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      aud: 'authenticated',
      exp: now + (24 * 60 * 60), // 24 hours
      iat: now,
      iss: 'supabase',
      sub: `student_${studentData.id}`,
      app_metadata: {
        student_id: studentData.id,
        school_id: requestData.schoolId,
        admission_number: studentData.admission_number,
        role: 'student'
      },
      user_metadata: {
        full_name: studentData.full_name,
        class: studentData.class
      }
    }

    const studentToken = await create({ alg: 'HS256', typ: 'JWT' }, payload, key)

    // Step 4: Log the login attempt (optional - for audit purposes)
    try {
      await supabaseAdmin
        .from('student_login_logs')
        .insert({
          student_id: studentData.id,
          school_id: requestData.schoolId,
          login_time: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        })
    } catch (logError) {
      // Don't fail the login if logging fails
      console.warn('Failed to log student login:', logError)
    }

    // Success response
    const response: StudentLoginResponse = {
      success: true,
      message: 'Student authentication successful',
      studentToken: studentToken,
      studentInfo: {
        id: studentData.id,
        fullName: studentData.full_name,
        class: studentData.class,
        admissionNumber: studentData.admission_number,
        schoolName: schoolData.school_name
      }
    }

    return successResponse(response)

  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse(`Internal server error: ${error.message}`, 500)
  }
})

/* 
Usage Example:

POST /functions/v1/student-login
{
  "schoolId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "admissionNumber": "MSA-101", 
  "dateOfBirth": "2010-05-15"
}

Response:
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
*/
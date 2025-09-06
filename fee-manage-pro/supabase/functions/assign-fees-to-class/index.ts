import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, errorResponse, successResponse } from '../_shared/cors.ts'

console.log("Assign Fees to Class Function v1.0.0")

interface AssignFeesRequest {
  classOrGrade: string
  feeStructureId: string
  dueDate: string // YYYY-MM-DD format
  overwriteExisting?: boolean // Default: false
}

interface AssignFeesResponse {
  success: boolean
  message: string
  assignedCount: number
  skippedCount: number
  assignedStudents: Array<{
    studentId: string
    admissionNumber: string
    fullName: string
    totalDue: number
  }>
  skippedStudents?: Array<{
    studentId: string
    admissionNumber: string
    fullName: string
    reason: string
  }>
  error?: string
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

    // Initialize Supabase client with the user's token
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

    // Initialize admin client for operations requiring elevated privileges
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

    const requestData: AssignFeesRequest = await req.json()
    
    // Validate required fields
    const requiredFields = ['classOrGrade', 'feeStructureId', 'dueDate']
    const missingFields = requiredFields.filter(field => !requestData[field])
    
    if (missingFields.length > 0) {
      return errorResponse(`Missing required fields: ${missingFields.join(', ')}`)
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(requestData.dueDate)) {
      return errorResponse('Due date must be in YYYY-MM-DD format')
    }

    // Step 1: Get current user information
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return errorResponse('Authentication failed', 401)
    }

    const schoolId = user.app_metadata?.school_id
    if (!schoolId) {
      return errorResponse('School ID not found in user metadata', 403)
    }

    // Step 2: Verify fee structure exists and belongs to the school
    const { data: feeStructureData, error: structureError } = await supabaseClient
      .from('fee_structures')
      .select(`
        id,
        structure_name,
        school_id,
        fee_structure_details (
          amount,
          fee_heads (
            head_name
          )
        )
      `)
      .eq('id', requestData.feeStructureId)
      .eq('school_id', schoolId)
      .single()

    if (structureError || !feeStructureData) {
      return errorResponse('Fee structure not found or access denied')
    }

    // Calculate total amount for the fee structure
    const totalDue = feeStructureData.fee_structure_details.reduce(
      (sum: number, detail: any) => sum + parseFloat(detail.amount || 0), 
      0
    )

    // Step 3: Get all students in the specified class
    const { data: studentsData, error: studentsError } = await supabaseClient
      .from('students')
      .select('id, admission_number, full_name, class')
      .eq('school_id', schoolId)
      .eq('class', requestData.classOrGrade)

    if (studentsError) {
      return errorResponse(`Failed to fetch students: ${studentsError.message}`)
    }

    if (!studentsData || studentsData.length === 0) {
      return errorResponse(`No students found in class: ${requestData.classOrGrade}`)
    }

    console.log(`Found ${studentsData.length} students in class ${requestData.classOrGrade}`)

    // Step 4: Check for existing fee assignments (if not overwriting)
    let existingAssignments: any[] = []
    if (!requestData.overwriteExisting) {
      const studentIds = studentsData.map(s => s.id)
      const { data: existing } = await supabaseClient
        .from('student_fees')
        .select('student_id')
        .in('student_id', studentIds)
        .eq('structure_id', requestData.feeStructureId)

      existingAssignments = existing || []
    }

    const existingStudentIds = new Set(existingAssignments.map(e => e.student_id))

    // Step 5: Prepare fee assignments
    const studentsToAssign = studentsData.filter(student => 
      requestData.overwriteExisting || !existingStudentIds.has(student.id)
    )

    const skippedStudents = studentsData.filter(student => 
      !requestData.overwriteExisting && existingStudentIds.has(student.id)
    ).map(student => ({
      studentId: student.id,
      admissionNumber: student.admission_number,
      fullName: student.full_name,
      reason: 'Fee already assigned (use overwriteExisting: true to replace)'
    }))

    if (studentsToAssign.length === 0) {
      return successResponse({
        message: 'No students to assign fees to',
        assignedCount: 0,
        skippedCount: skippedStudents.length,
        assignedStudents: [],
        skippedStudents: skippedStudents
      })
    }

    // Step 6: Delete existing assignments if overwriting
    if (requestData.overwriteExisting && existingAssignments.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('student_fees')
        .delete()
        .in('student_id', studentsToAssign.map(s => s.id))
        .eq('structure_id', requestData.feeStructureId)

      if (deleteError) {
        console.error('Failed to delete existing assignments:', deleteError)
        // Continue anyway
      }
    }

    // Step 7: Create new fee assignments
    const feeAssignments = studentsToAssign.map(student => ({
      student_id: student.id,
      school_id: schoolId,
      structure_id: requestData.feeStructureId,
      due_date: requestData.dueDate,
      total_due: totalDue,
      amount_paid: 0,
      status: 'unpaid'
    }))

    const { data: insertedFees, error: insertError } = await supabaseAdmin
      .from('student_fees')
      .insert(feeAssignments)
      .select('id, student_id, total_due')

    if (insertError) {
      console.error('Fee assignment insertion error:', insertError)
      return errorResponse(`Failed to assign fees: ${insertError.message}`, 500)
    }

    // Step 8: Prepare response data
    const assignedStudents = studentsToAssign.map(student => ({
      studentId: student.id,
      admissionNumber: student.admission_number,
      fullName: student.full_name,
      totalDue: totalDue
    }))

    const response: AssignFeesResponse = {
      success: true,
      message: `Successfully assigned fees to ${studentsToAssign.length} students in ${requestData.classOrGrade}`,
      assignedCount: studentsToAssign.length,
      skippedCount: skippedStudents.length,
      assignedStudents: assignedStudents,
      skippedStudents: skippedStudents.length > 0 ? skippedStudents : undefined
    }

    return successResponse(response)

  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse(`Internal server error: ${error.message}`, 500)
  }
})

/* 
Usage Example:

POST /functions/v1/assign-fees-to-class
Authorization: Bearer <admin-jwt-token>
{
  "classOrGrade": "Grade 10",
  "feeStructureId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "dueDate": "2025-10-15",
  "overwriteExisting": false
}

Response:
{
  "success": true,
  "message": "Successfully assigned fees to 2 students in Grade 10",
  "assignedCount": 2,
  "skippedCount": 0,
  "assignedStudents": [
    {
      "studentId": "student-uuid-1",
      "admissionNumber": "MSA-101",
      "fullName": "Rohan Verma",
      "totalDue": 82000.00
    },
    {
      "studentId": "student-uuid-2", 
      "admissionNumber": "MSA-102",
      "fullName": "Arjun Patel",
      "totalDue": 82000.00
    }
  ]
}
*/
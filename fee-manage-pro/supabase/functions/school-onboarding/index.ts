import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("School Onboarding Function v1.0.0")

interface OnboardingRequest {
  schoolName: string
  city: string
  state: string
  adminEmail: string
  adminPassword: string
  adminFullName: string
  adminRole: string
}

interface OnboardingResponse {
  success: boolean
  message: string
  schoolId?: string
  adminId?: string
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
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const requestData: OnboardingRequest = await req.json()
    
    // Validate required fields
    const requiredFields = ['schoolName', 'city', 'state', 'adminEmail', 'adminPassword', 'adminFullName', 'adminRole']
    const missingFields = requiredFields.filter(field => !requestData[field])
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 1: Create the school record
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        school_name: requestData.schoolName,
        city: requestData.city,
        state: requestData.state
      })
      .select('id')
      .single()

    if (schoolError) {
      console.error('School creation error:', schoolError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create school record',
          details: schoolError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const schoolId = schoolData.id

    // Step 2: Create the admin user in auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.adminEmail,
      password: requestData.adminPassword,
      email_confirm: true,
      app_metadata: {
        school_id: schoolId,
        full_name: requestData.adminFullName,
        role: requestData.adminRole
      }
    })

    if (userError) {
      console.error('User creation error:', userError)
      
      // Rollback: Delete the school record
      await supabaseAdmin
        .from('schools')
        .delete()
        .eq('id', schoolId)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create admin user',
          details: userError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const adminUserId = userData.user?.id

    if (!adminUserId) {
      // Rollback: Delete the school record
      await supabaseAdmin
        .from('schools')
        .delete()
        .eq('id', schoolId)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to retrieve admin user ID' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 3: Create the admin profile record
    const { error: adminError } = await supabaseAdmin
      .from('admins')
      .insert({
        id: adminUserId,
        school_id: schoolId,
        full_name: requestData.adminFullName,
        role: requestData.adminRole
      })

    if (adminError) {
      console.error('Admin profile creation error:', adminError)
      
      // Rollback: Delete user and school
      await supabaseAdmin.auth.admin.deleteUser(adminUserId)
      await supabaseAdmin
        .from('schools')
        .delete()
        .eq('id', schoolId)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create admin profile',
          details: adminError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 4: Create default fee heads for the school
    const defaultFeeHeads = [
      'Tuition Fee',
      'Sports Fee',
      'Lab Fee',
      'Library Fee',
      'Transport Fee',
      'Examination Fee',
      'Development Fee'
    ]

    const { error: feeHeadsError } = await supabaseAdmin
      .from('fee_heads')
      .insert(
        defaultFeeHeads.map(headName => ({
          school_id: schoolId,
          head_name: headName
        }))
      )

    if (feeHeadsError) {
      console.error('Fee heads creation error:', feeHeadsError)
      // Continue anyway - fee heads can be added later
    }

    // Success response
    const response: OnboardingResponse = {
      success: true,
      message: 'School onboarding completed successfully',
      schoolId: schoolId,
      adminId: adminUserId
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
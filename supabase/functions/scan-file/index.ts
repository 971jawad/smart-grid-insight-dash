
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
export async function corsHandler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    })
  }
  return null
}

// Function to scan files for threats
export async function scanFile(fileId: string, bucketId: string) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    )

    // Get file metadata
    const { data: fileData, error: fileError } = await supabaseAdmin
      .from('csv_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !fileData) {
      console.error('Error fetching file metadata:', fileError)
      return { success: false, message: 'File not found' }
    }

    // Download file
    const { data, error: downloadError } = await supabaseAdmin
      .storage
      .from(bucketId)
      .download(fileData.storage_path)

    if (downloadError || !data) {
      console.error('Error downloading file:', downloadError)
      return { success: false, message: 'Failed to download file' }
    }

    // Basic security checks
    const textContent = await data.text()
    
    // Check file extension - must be CSV
    if (!fileData.mime_type.includes('csv') && 
        !fileData.mime_type.includes('text/plain') && 
        !fileData.mime_type.includes('text/comma-separated-values')) {
      await updateScanStatus(supabaseAdmin, fileId, 'failed', 'Invalid file type. Only CSV files are allowed.')
      return { success: false, message: 'Invalid file type' }
    }
    
    // Check for suspicious content (basic check)
    // This is just a simple example - real security scanning would be more comprehensive
    const suspiciousPatterns = [
      '<script', 'javascript:', 'vbscript:', 
      'data:', 'onerror=', 'onload=', 
      '#!/', 'import os', 'system(',
      'exec(', 'eval(', 'Function('
    ]
    
    const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
      textContent.toLowerCase().includes(pattern.toLowerCase())
    )
    
    if (hasSuspiciousContent) {
      await updateScanStatus(supabaseAdmin, fileId, 'failed', 'File contains potentially malicious content')
      return { success: false, message: 'File contains potentially malicious content' }
    }
    
    // Check CSV structure (basic validation)
    const lines = textContent.split('\n')
    if (lines.length < 2) {
      await updateScanStatus(supabaseAdmin, fileId, 'failed', 'File appears to be empty or not a valid CSV')
      return { success: false, message: 'File appears to be empty or not a valid CSV' }
    }
    
    // Get header line and check for comma separation
    const headerLine = lines[0].trim()
    if (!headerLine.includes(',')) {
      await updateScanStatus(supabaseAdmin, fileId, 'failed', 'File does not appear to be comma-separated')
      return { success: false, message: 'File does not appear to be comma-separated' }
    }
    
    // All checks passed
    await updateScanStatus(supabaseAdmin, fileId, 'passed', 'File passed security scan')
    return { success: true, message: 'File passed security scan' }
    
  } catch (error) {
    console.error('Error in scanFile:', error)
    return { success: false, message: 'Error scanning file' }
  }
}

// Update scan status in database
async function updateScanStatus(supabase: any, fileId: string, status: string, message: string) {
  try {
    const { error } = await supabase
      .from('csv_files')
      .update({ 
        security_scan_status: status,
        security_scan_message: message
      })
      .eq('id', fileId)
    
    if (error) {
      console.error('Error updating scan status:', error)
    }
  } catch (error) {
    console.error('Error in updateScanStatus:', error)
  }
}

// Handle incoming requests
Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = await corsHandler(req)
  if (corsResponse) return corsResponse

  // Process the request
  try {
    const { fileId, bucketId } = await req.json()
    
    if (!fileId || !bucketId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: fileId and bucketId required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    const result = await scanFile(fileId, bucketId)
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

import { NextResponse } from 'next/server';
import { uploadToR2 } from '../../../lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('[TestR2 API] Request received for R2 test');
  
  try {
    // Create test buffer
    const testBuffer = Buffer.from('Test file ' + Date.now());
    
    // Test upload
    const result = await uploadToR2(
      testBuffer,
      `test-${Date.now()}.txt`,
      'text/plain'
    );
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[TestR2 API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 
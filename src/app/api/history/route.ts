import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Using public client for reads

export async function GET(request: Request) {
  console.log("[API /api/history] Received request to fetch history.");
  try {
    const { data, error, count } = await supabase
      .from('video_history')
      .select('*' , { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /api/history] Supabase error fetching history:', error);
      throw error;
    }
    
    console.log(`[API /api/history] Successfully fetched ${data?.length || 0} history records. Total DB count: ${count}`);
    // Optional: Log a sample of data if needed for deeper debugging
    // if (data && data.length > 0) {
    //   console.log("[API /api/history] Sample of fetched data:", JSON.stringify(data.slice(0, 1), null, 2));
    // }

    return NextResponse.json({ history: data }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('[API /api/history] Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video history', details: (error instanceof Error) ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 
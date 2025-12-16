import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Perform a lightweight read operation to signal activity
        // Listing just 1 file from the bucket is sufficient
        const { data, error } = await supabase.storage.from('question-images').list('', { limit: 1 });

        if (error) {
            console.error('Supabase keep-alive error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Supabase pinged successfully',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Unexpected keep-alive error:', err);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

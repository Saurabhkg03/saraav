import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const channelId = formData.get('channelId') as string;

        // 1. Authorization
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        let userId: string;
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
        } catch (error) {
            console.error("Token verification failed:", error);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        if (!file || !channelId) {
            return NextResponse.json({ error: 'Missing file or channelId' }, { status: 400 });
        }

        // 2. Setup Supabase Admin
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing Supabase config");
            return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 3. Upload File
        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        // Sanitize filename
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const path = `public/${channelId}/${userId}/${timestamp}_${cleanFileName}`;

        const { data, error } = await supabase.storage
            .from('chat-attachments')
            .upload(path, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error("Supabase upload error:", error);
            return NextResponse.json({ error: 'Upload Failed' }, { status: 500 });
        }

        // 4. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(path);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            name: file.name,
            type: file.type
        });

    } catch (error) {
        console.error("Upload route error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

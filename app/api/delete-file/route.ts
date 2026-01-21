import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const { paths } = await req.json();

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

        if (!paths || !Array.isArray(paths) || paths.length === 0) {
            return NextResponse.json({ error: 'No paths provided' }, { status: 400 });
        }

        // 2. Validate Ownership (Path Security)
        // Ensure user is only deleting files that belong to them (contain their userId)
        // Path format: public/{channelId}/{userId}/{filename}
        const arePathsValid = paths.every(path => path.includes(`/${userId}/`));

        if (!arePathsValid) {
            console.warn(`User ${userId} attempted to delete files they do not own:`, paths);
            return NextResponse.json({ error: 'Forbidden: You can only delete your own files' }, { status: 403 });
        }

        // 3. Setup Supabase Admin
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 4. Delete Files
        const { data, error } = await supabase.storage
            .from('chat-attachments')
            .remove(paths);

        if (error) {
            console.error("Supabase delete error:", error);
            return NextResponse.json({ error: 'Delete Failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error("Delete route error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Basic authorization check (e.g., ensure it's called by a trusted source like Vercel Cron)
    // For Vercel Cron, you can check headers if needed, but for now we'll rely on the route being secret or relying on service role permissions being safe.
    // Better practice: Check for an Authorization header with a CRON_SECRET.

    try {
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing Supabase environment variables for cleanup");
            return new NextResponse('Internal Server Error: Missing Config', { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const BUCKET_NAME = 'chat-attachments';

        // 1. List files
        // Supabase list limit is usually 100. We might need to paginate if we have many files.
        // For a simple cron, let's grab a batch. safely.
        const { data: files, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list('', { limit: 1000, search: '' }); // recursive? NO. 
        // Warning: .list() is not recursive by default on folders. 
        // Our structure is public/{channelId}/{userId}/{filename}. 
        // This is deep nesting. 
        // Postgres RLS cleanup is often better for this, or using a recursive function.
        // Supabase Storage API doesn't have a simple "list all recursive".
        // However, we can use the `extensions` logic or just rely on a DB query if we stored file metadata in a table.

        // Wait, standard Supabase Storage management usually implies using a bucket lifecycle policy if available (Pro plan).
        // On free tier, we must do it manually.

        // To delete recursively, we need to know the paths. 
        // Since we don't have a database table tracking these specific files (only Firestore messages have the URLs),
        // Iterate folders is hard.

        // Workaround: We can't easily list ALL files in a deeply nested structure without many API calls.
        // BUT, if we can run a SQL query against `storage.objects`, that would be best.
        // But we don't have direct SQL access here easily unless we use the rpc or just `supabase.from('storage.objects').select('*')` if we have access to the schema.
        // Actually, with Service Role, we can query `storage.objects` table directly!

        // Query storage.objects directly in the `storage` schema
        const { data: oldFiles, error: dbError } = await supabase
            .schema('storage')
            .from('objects')
            .select('name, id, created_at, bucket_id, path_tokens')
            .eq('bucket_id', BUCKET_NAME)
            .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Older than 30 days

        if (dbError) {
            console.error("Error fetching old files from DB:", dbError);
            return new NextResponse('Database Error', { status: 500 });
        }

        if (oldFiles && oldFiles.length > 0) {
            const pathsToDelete = oldFiles.map((f: any) => {
                // path_tokens is array like ['public', 'channelId', '...']
                // or just construct from name if flattened? 
                // storage.objects usually has `name` as the full path (e.g. 'public/channel/user/file.png')
                return f.name;
            });

            console.log(`Found ${pathsToDelete.length} files to delete.`);

            const { error: deleteError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove(pathsToDelete);

            if (deleteError) {
                console.error("Error deleting files:", deleteError);
                return new NextResponse('Deletion Error', { status: 500 });
            }

            return NextResponse.json({ success: true, deletedCount: pathsToDelete.length });
        }

        return NextResponse.json({ success: true, deletedCount: 0 });

    } catch (error) {
        console.error("Cleanup job failed:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

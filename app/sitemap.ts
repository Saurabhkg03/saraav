
import { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase-admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://saraav.com';

    // Static routes
    const routes = [
        '',
        '/marketplace',
        '/courses',
        '/login',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1,
    }));

    // Dynamic routes (Subjects)
    let subjectRoutes: MetadataRoute.Sitemap = [];

    try {
        const subjectsSnapshot = await adminDb.collection('subjects').get();

        subjectRoutes = subjectsSnapshot.docs.map((doc) => ({
            url: `${baseUrl}/marketplace/${doc.id}`,
            lastModified: new Date(), // Ideally this would be the actual updated time from the doc
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));
    } catch (error) {
        console.error("Error generating sitemap:", error);
    }

    return [...routes, ...subjectRoutes];
}

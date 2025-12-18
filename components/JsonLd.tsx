import { WithContext, Organization, WebSite } from 'schema-dts';

export default function JsonLd() {
    const organizationSchema: WithContext<Organization> = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Saraav',
        url: 'https://saraav.in',
        logo: 'https://saraav.in/logo.jpg',
        sameAs: [
            'https://twitter.com/saraav_in', // Replace with actual if known, or remove
            // Add other social profiles here
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '', // Add if available
            contactType: 'customer support',
        },
    };

    const websiteSchema: WithContext<WebSite> = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Saraav',
        url: 'https://saraav.in',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://saraav.in/search?q={search_term_string}',
            },
            'query-input': 'required name=search_term_string',
        } as any,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />
        </>
    );
}

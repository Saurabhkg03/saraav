import { WithContext, Organization, WebSite } from 'schema-dts';

export default function JsonLd() {
    const organizationSchema: WithContext<Organization> = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Saraav',
        url: 'https://saraav.in',
        logo: 'https://saraav.in/logo.jpg',
        sameAs: [
            // REPLACE THESE with your REAL profiles. Do not leave them empty.
            'https://www.linkedin.com/company/saraav-in',
            'https://www.instagram.com/saraav.in'
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            //telephone: '', // Add if available
            contactType: 'customer support',
            email: 'saraav.connect@gmail.com'
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

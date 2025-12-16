export default function PrivacyPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Privacy Policy</h1>
            <div className="prose max-w-none text-zinc-600 dark:prose-invert dark:text-zinc-400">
                <p className="mb-4 text-sm text-zinc-500">Last Updated: {new Date().toLocaleDateString()}</p>

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">1. Information We Collect</h2>
                <p>We collect information to provide better services to all our users.</p>
                <ul className="list-disc pl-6">
                    <li><strong>Personal Information:</strong> When you sign up via Google Login, we collect your name, email address, and profile picture.</li>
                    <li><strong>Usage Data:</strong> We collect data on how you interact with our courses, such as progress tracking, questions solved, and units completed.</li>
                </ul>

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">2. How We Use Information</h2>
                <ul className="list-disc pl-6">
                    <li>To provide and maintain our Service.</li>
                    <li>To notify you about changes to our Service.</li>
                    <li>To allow you to participate in interactive features (like tracking progress).</li>
                    <li>To provide customer support.</li>
                    <li>To monitor the usage of the Service.</li>
                </ul>

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">3. Payment Information</h2>
                <p>
                    We use Razorpay for processing payments. We do not store your credit card details or bank information. All payment information is securely processed by Razorpay in accordance with PCI-DSS standards.
                </p>

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">4. Third-Party Services</h2>
                <ul className="list-disc pl-6">
                    <li><strong>Google Firebase:</strong> We use Firebase for authentication and database services.</li>
                    <li><strong>YouTube API:</strong> We use YouTube API services to display video content. We do not track your viewing history on YouTube, but your interaction with the embedded player is subject to Google's Privacy Policy.</li>
                </ul>

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">5. Security</h2>
                <p>
                    The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                </p>
            </div>
        </div>
    );
}

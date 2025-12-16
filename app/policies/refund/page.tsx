export default function RefundPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Cancellation and Refund Policy</h1>
            <div className="prose max-w-none text-zinc-600 dark:prose-invert dark:text-zinc-400">

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">1. Cancellation</h2>
                <p>
                    As Saraav sells digital products (educational courses and study materials) that are instantly accessible upon purchase, we do not offer cancellations once the payment has been processed and the course content has been unlocked in your account.
                </p>

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">2. Refunds</h2>
                <p>
                    We generally do not provide refunds for digital products. However, we may consider refund requests under the following exceptional circumstances:
                </p>
                <ul className="list-disc pl-6">
                    <li><strong>Technical Issues:</strong> If you are unable to access the course content due to a technical error on our end (e.g., database failure), and we are unable to resolve it within 7 working days.</li>
                    <li><strong>Duplicate Payment:</strong> If you have been charged twice for the same transaction.</li>
                </ul>

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">3. Non-Refundable Items</h2>
                <p>
                    The following are <strong>not</strong> grounds for a refund:
                </p>
                <ul className="list-disc pl-6">
                    <li><strong>Third-Party Content Availability:</strong> If a referenced YouTube video is removed, made private, or has embedding disabled by the original creator. (Remember, you are paying for the text solutions and curation, not the videos).</li>
                    <li><strong>Change of Mind:</strong> If you decide you no longer need the study material after purchase.</li>
                </ul>

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">4. Refund Process</h2>
                <p>
                    To request a refund for the exceptional cases listed above, please contact us at [YOUR SUPPORT EMAIL] within 5 days of the purchase. If your refund is approved, the amount will be credited back to your original method of payment within 5-7 business days.
                </p>
            </div>
        </div>
    );
}
export default function ShippingPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Shipping and Delivery Policy</h1>
            <div className="prose max-w-none text-zinc-600 dark:prose-invert dark:text-zinc-400">

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">1. Nature of Goods</h2>
                <p>
                    Saraav deals exclusively in digital goods and online educational content. We do not sell or ship any physical products (such as books, DVDs, or notes).
                </p>

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">2. Delivery Process</h2>
                <ul className="list-disc pl-6">
                    <li><strong>Instant Access:</strong> Upon successful payment, the purchased course/content is automatically and instantly unlocked in your user account.</li>
                    <li><strong>Confirmation:</strong> You will receive a confirmation email or notification within the app immediately after the transaction is successful.</li>
                </ul>

                <h2 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">3. Delivery Timelines</h2>
                <p>
                    Since the delivery is electronic, the "shipping" is immediate. There is no waiting time for dispatch. If you have paid but cannot access the content, please contact our support team immediately.
                </p>
            </div>
        </div>
    );
}

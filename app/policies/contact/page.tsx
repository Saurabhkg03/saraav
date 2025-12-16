export default function ContactPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Contact Us</h1>
            <div className="prose max-w-none text-zinc-600 dark:prose-invert dark:text-zinc-400">
                <p className="mb-6">
                    We are here to help you! If you have any questions, concerns, or feedback, please reach out to us using the details below.
                </p>

                <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="grid gap-6 md:grid-cols-2">





                        <div>
                            <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">Contact Details</h3>
                            <p>Email: saraav.connect@gmail.com</p>
                            
                        </div>

                        <div>
                            <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">Operating Hours</h3>
                            <p>Monday to Saturday, 10:00 AM to 6:00 PM IST.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

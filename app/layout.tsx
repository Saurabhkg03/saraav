import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Toaster } from "sonner";
import { FeedbackProvider } from "@/context/FeedbackContext";
import { FeedbackReminder } from "@/components/FeedbackReminder";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://saraav.in'),
  title: {
    default: "Saraav | सराव | SGBAU Exam Prep & Solutions",
    template: "%s | Saraav"
  },
  description: "Ace your SGBAU engineering exams with Saraav. Access previous year questions, expert video solutions, and syllabus tracking.",
  keywords: ["SGBAU", "Amravati University", "Engineering Exams", "PYQ", "Previous Year Questions", "Exam Prep"],

  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icon.png' },
    ],
  },

  openGraph: {
    title: "Saraav | The Smarter Way to Study for SGBAU",
    description: "Master your engineering subjects with high-frequency questions, video solutions, and smart tracking.",
    url: 'https://saraav.in',
    siteName: 'Saraav',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Saraav | SGBAU Exam Prep",
    description: "Don't study blindly. Get the most asked questions and solutions for Amravati University exams.",
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-200 antialiased")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <FeedbackProvider>
              <FeedbackReminder />
              <div className="flex min-h-screen flex-col bg-white dark:bg-black">
                <Navbar />
                <LayoutWrapper>
                  {children}
                </LayoutWrapper>
                <Footer />
                <Toaster richColors position="top-center" />
              </div>
            </FeedbackProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

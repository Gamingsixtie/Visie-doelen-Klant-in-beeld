import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/session-context";
import { ToastProvider } from "@/components/ui";
import { SaveStatusProvider } from "@/lib/save-status-context";

export const metadata: Metadata = {
  title: "Klant in Beeld - Consolidatie App",
  description: "Consolideer MT-canvassen en kom tot gedeelde visie en doelen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <SaveStatusProvider>
          <SessionProvider>
            <ToastProvider>
              <a href="#main-content" className="skip-link">
                Naar hoofdinhoud
              </a>
              <div className="min-h-screen flex flex-col">
                <main id="main-content">
                  {children}
                </main>
              </div>
            </ToastProvider>
          </SessionProvider>
        </SaveStatusProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Doodad.AI",
  description: "Generate unique AI-powered commentary for your videos!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error("[RootLayout] Error getting user:", error.message);
  }

  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900`}>
        <header className="bg-white shadow-md border-b border-gray-200">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="text-2xl font-bold text-blue-600 tracking-tight">
                  Doodad.AI
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/feed" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  My Feed
                </Link>
                <Link href="/characters" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Characters
                </Link>
                {user ? (
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Sign Out</button>
                  </form>
                ) : (
                  <Link href="/auth/signin" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
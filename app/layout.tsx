import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FJ Pay",
  description: "FJ Pay Worker Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "backdrop-blur-md !bg-white/80 !border !border-zinc-200 !shadow-lg !rounded-xl !font-sans",
              success:
                "!bg-green-50/90 !border-green-200 !text-green-900",
              error:
                "!bg-red-50/90 !border-red-200 !text-red-900",
              title: "!text-sm !font-semibold",
              description: "!text-xs !opacity-70",
            },
          }}
        />
      </body>
    </html>
  );
}

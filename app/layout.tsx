import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const headingFont = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
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
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden font-sans bg-zinc-50 text-zinc-900">
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          closeButton
          richColors
          toastOptions={{
            classNames: {
              toast:
                "backdrop-blur-md !bg-white/95 !border !border-zinc-200 !shadow-lg !rounded-xl !font-sans !pr-10",
              success:
                "!bg-emerald-50/95 !border-emerald-200 !text-emerald-950",
              error:
                "!bg-rose-50/95 !border-rose-200 !text-rose-950",
              title: "!text-sm !font-semibold",
              description: "!text-xs !opacity-75",
              closeButton:
                "!left-auto !right-2.5 !top-2.5 !transform-none !bg-white hover:!bg-zinc-100 !border !border-zinc-200 !text-zinc-600 hover:!text-zinc-900 !h-6 !w-6 !opacity-90 hover:!opacity-100 !shadow-xs !transition-all !cursor-pointer",
            },
          }}
        />
      </body>
    </html>
  );
}

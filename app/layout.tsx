import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Providers } from "./providers"
import "./globals.css"

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Nsesa",
  description: "Nsesa Worker Portal",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

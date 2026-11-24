import type { Metadata, Viewport } from "next";
import { Fredoka, Inter, Permanent_Marker } from "next/font/google";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Body and numbers: SF Pro on Apple devices (system font), Inter elsewhere.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

// Display headlines: a gritty brush marker.
const brush = Permanent_Marker({
  variable: "--font-brush",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Section headings: Talina when its licensed file is in public/fonts, otherwise Fredoka (closest open match).
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Expenses Tracker",
    template: "%s · Expenses Tracker",
  },
  description: "Know exactly where your money goes. Income and expenses month by month, with savings kept in a space of their own.",
  applicationName: "Expenses Tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Expenses",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1d1f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${inter.variable} ${brush.variable} ${fredoka.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-right" closeButton mobileOffset={{ bottom: "5.5rem" }} />
        </ThemeProvider>
      </body>
    </html>
  );
}

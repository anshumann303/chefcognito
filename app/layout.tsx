import type React from "react";
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

// Prevent static pre-rendering — pages use Clerk which requires runtime env vars
export const dynamic = "force-dynamic";

const ogImageUrl = "https://readmecodegen.vercel.app/api/og-generator?title=ChefCognito&subtitle=Your+Smart+Sous-Chef&author=ANSHUMAN+LAWANKAR&authorImageUrl=https%3A%2F%2Freadmecodegen.vercel.app%2Flogo.png&logoUrl=https%3A%2F%2Fencrypted-tbn0.gstatic.com%2Fimages%3Fq%3Dtbn%3AANd9GcR2AVK1_bFOPfp-HUeM9rqrCTYSsqii0hwusw%26s&appName=ChefCognito";

export const metadata: Metadata = {
	title: "ChefCognito",
	description: "Transform your ingredients into delicious recipes with AI",
	generator: "Next.js",
	manifest: "/manifest.json",
	openGraph: {
		images: [{ url: ogImageUrl }],
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "ChefCognito",
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
	],
	minimumScale: 1,
	initialScale: 1,
	width: "device-width",
	viewportFit: "cover",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<head>
					<style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
          `}</style>
				</head>
				<body>
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem
						disableTransitionOnChange
					>
						{children}
						<Toaster />
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}

"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// This page handles the OAuth redirect from Google/GitHub etc.
// Clerk redirects here after the user authenticates with a social provider.
export default function SSOCallbackPage() {
	return <AuthenticateWithRedirectCallback />;
}

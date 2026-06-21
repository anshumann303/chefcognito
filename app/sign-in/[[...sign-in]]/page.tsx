import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
			<SignIn routing="path" path="/sign-in" />
		</div>
	);
}

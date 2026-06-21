import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
			<SignUp routing="path" path="/sign-up" />
		</div>
	);
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-black">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-gray-800">
            We've sent you a magic link to sign in. Please check your email and click the link.
          </p>
        </div>
      </div>
    </div>
  )
}

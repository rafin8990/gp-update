import Image from "next/image"
import LoginForm from "@/components/login-form"

export default function Home() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center items-center px-6 md:px-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-12">
            <Image 
              src="/logo.svg" 
              alt="AssetIQ Logo" 
              width={160} 
              height={160} 
              priority 
            />
          </div>

          <LoginForm />
        </div>
      </div>

      <div className="hidden lg:block relative m-5 rounded-2xl overflow-hidden">
        <Image 
          src="/login-cover.svg" 
          alt="Asset Management" 
          fill 
          className="object-cover" 
          priority 
        />
      </div>
    </main>
  )
}

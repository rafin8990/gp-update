import Link from "next/link"

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white text-center text-sm text-gray-500 py-2 border-t border-gray-200 z-50">
      <div className="flex items-center justify-center space-x-4">
        <span className="font-bold">Asset IQ © 2025</span>
        <span>|</span>
        <Link href="#" className="hover:text-emerald-500">
          Terms of Service
        </Link>
        <span>|</span>
        <div className="flex items-center">
          <span>Developed by</span>
          <Link href="#" className="text-emerald-500 ml-1 hover:underline font-bold">
            Ether Tech
          </Link>
        </div>
      </div>
    </footer>
  )
}

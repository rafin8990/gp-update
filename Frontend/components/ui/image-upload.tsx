import { UploadCloud, X } from "lucide-react"
import Image from "next/image"
import { Button } from "./button"

interface ImageUploadProps {
  value?: string
  onChange: (value: string) => void
  onRemove: () => void
}

export function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // API functionality removed - using mock URL
      const mockUrl = URL.createObjectURL(file)
      onChange(mockUrl)
    } catch (error) {
      console.error("Error uploading image:", error)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {value ? (
        <div className="relative h-20 w-20">
          <Image
            src={value}
            alt="Uploaded image"
            fill
            className="object-cover rounded-md"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
          <UploadCloud className="h-6 w-6 text-gray-400" />
          <span className="text-xs text-gray-500 mt-1">Upload</span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleUpload}
          />
        </label>
      )}
    </div>
  )
} 
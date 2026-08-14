"use client"

import { useState, useCallback } from "react"
import { useDropzone, FileRejection } from "react-dropzone"
import { ImageIcon, Loader2, X, UploadCloud } from "lucide-react"

// TODO: Switch to signed uploads via a backend endpoint for production security
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    const rejection = fileRejections[0]
    if (!rejection) return

    const issue = rejection.errors?.[0]
    if (issue?.code === "file-too-large") {
      setError("Image size exceeds 5MB limit. Please select a smaller file.")
    } else if (issue?.code === "file-invalid-type") {
      setError("Unsupported file format. Please upload JPG, PNG, or WEBP.")
    } else {
      setError(issue?.message || "File rejected. Please try another image.")
    }
  }, [])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError("Cloudinary configuration missing (CLOUD_NAME or UPLOAD_PRESET).")
      return
    }

    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", UPLOAD_PRESET)

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error?.message || "Cloudinary upload failed")
      }

      onChange(data.secure_url)
    } catch (err: any) {
      console.error("Image upload error:", err)
      setError(err?.message || "Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: uploading,
  })

  if (value) {
    return (
      <div className="relative w-24 h-24">
        <img
          src={value}
          alt="Shop image"
          className="w-24 h-24 rounded-full object-cover border border-zinc-200"
        />
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-green-400 bg-green-50"
            : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"
        } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <>
            <Loader2 className="h-7 w-7 text-zinc-400 animate-spin" />
            <p className="text-sm text-zinc-500">Uploading…</p>
          </>
        ) : isDragActive ? (
          <>
            <UploadCloud className="h-7 w-7 text-green-500" />
            <p className="text-sm text-green-600 font-medium">Drop it here</p>
          </>
        ) : (
          <>
            <ImageIcon className="h-7 w-7 text-zinc-300" />
            <p className="text-sm text-zinc-500">
              Drag & drop or <span className="text-green-600 font-medium">browse</span>
            </p>
            <p className="text-xs text-zinc-400">JPG, PNG, WEBP · max 5MB</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

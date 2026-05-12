import React, { useRef, useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react'
import { ImageLightbox } from './ImageLightbox'

interface ImageUploadProps {
  label: string
  helperText?: string
  value?: string[] // array of uploaded image URLs
  onChange: (value: string[]) => void
  id: string
  max?: number // max number of images allowed
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB per file

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]

const UPLOAD_API_URL = 'https://imageapi.forexdairy.com/upload'

async function uploadImageToCustomApi(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(UPLOAD_API_URL, {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Upload failed')
  }

  if (!data.url) {
    throw new Error('Upload API did not return image URL')
  }

  return data.url
}

export function ImageUpload({
  label,
  helperText,
  value = [],
  onChange,
  id,
  max = 10,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)

      const fileArray = Array.from(files)

      // Check total count
      if (value.length + fileArray.length > max) {
        setError(`Maximum ${max} images allowed. You have ${value.length} already.`)
        return
      }

      const validFiles: File[] = []

      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError('Some files were skipped. Only JPG, PNG, GIF, or WebP images are accepted.')
          continue
        }

        if (file.size > MAX_FILE_SIZE) {
          setError('Some files were skipped. Each image must be under 5MB.')
          continue
        }

        validFiles.push(file)
      }

      if (validFiles.length === 0) return

      setIsProcessing(true)

      const newImages: string[] = []

      try {
        for (const file of validFiles) {
          const url = await uploadImageToCustomApi(file)
          newImages.push(url)
        }

        onChange([...value, ...newImages])
      } catch (err: any) {
        setError(`Image upload failed: ${err.message || 'Unknown error'}`)
      } finally {
        setIsProcessing(false)
      }
    },
    [onChange, value, max]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files

    if (files && files.length > 0) {
      processFiles(files)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isProcessing) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (isProcessing) return

    const files = e.dataTransfer.files

    if (files && files.length > 0) {
      processFiles(files)
    }
  }

  const handleRemove = (index: number) => {
    const updated = value.filter((_, i) => i !== index)
    onChange(updated)
    setError(null)
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="trade-form-label">
        {label}
      </label>

      {helperText && (
        <p className="text-xs text-muted-foreground -mt-1">
          {helperText}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept=".jpg,.jpeg,.png,.gif,.webp"
        multiple
        onChange={handleFileSelect}
        className="sr-only"
        aria-label={label}
        disabled={isProcessing}
      />

      {/* Image previews grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map((img, idx) => (
            <div
              key={`${img}-${idx}`}
              className="relative group image-preview-card aspect-square cursor-pointer"
              onClick={() => {
                setLightboxIndex(idx)
                setLightboxOpen(true)
              }}
            >
              <img
                src={img}
                alt={`${label} ${idx + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(idx)
                }}
                className="absolute top-1 right-1 p-1 bg-red-500/90 rounded-full hover:bg-red-600 transition-colors shadow-md opacity-0 group-hover:opacity-100"
                title="Remove image"
                disabled={isProcessing}
              >
                <X className="h-3 w-3 text-white" />
              </button>

              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5 rounded-b-lg">
                {idx + 1}
              </div>
            </div>
          ))}

          {/* Add more button */}
          {value.length < max && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-muted/40 hover:border-muted-foreground/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add more images"
              disabled={isProcessing}
            >
              <Plus className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {isProcessing ? 'Uploading...' : 'Add'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Upload zone shown when no images */}
      {value.length === 0 && (
        <div
          className={`image-upload-zone ${isDragging ? 'image-upload-zone-active' : ''
            } ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}
          onClick={() => {
            if (!isProcessing) {
              fileInputRef.current?.click()
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          aria-label={`Upload ${label}`}
        >
          <div className="flex flex-col items-center gap-2 py-4">
            <div
              className={`p-3 rounded-full transition-colors ${isDragging
                ? 'bg-primary/10 dark:bg-primary/20'
                : 'bg-muted'
                }`}
            >
              {isDragging ? (
                <ImageIcon className="h-6 w-6 text-foreground" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isProcessing
                  ? 'Uploading images...'
                  : isDragging
                    ? 'Drop images here'
                    : 'Click or drag to upload'}
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, GIF, or WebP • Max 5MB each • Up to {max} images
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drag overlay for when images already exist */}
      {value.length > 0 && value.length < max && (
        <div
          className={`${isDragging ? 'block' : 'hidden'
            } image-upload-zone image-upload-zone-active`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-2 py-3">
            <ImageIcon className="h-5 w-5 text-foreground" />
            <p className="text-sm font-medium">
              Drop images here
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
          <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
          {error}
        </p>
      )}

      {/* Fullscreen Lightbox */}
      <ImageLightbox
        images={value}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  )
}
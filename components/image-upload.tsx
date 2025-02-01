// components/ImageUpload.tsx
import React, { useState } from 'react';
import Image from 'next/image';
import { useParams } from "next/navigation";


interface ImageUploadProps {
  onImageChange: (file: File | null) => void;
  initialImage?: string;
}

export default function ImageUpload({ onImageChange, initialImage }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(initialImage || null);
  const params = useParams();


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      onImageChange(null);
      setPreview(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-32 h-32 relative rounded-full overflow-hidden bg-zinc-700">
        {preview ? (
          <Image
            src={preview}
            alt="Agent profile"
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400">
            No image
          </div>
        )}
      </div>
      {params.userId !== 'template' && <div><input
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={handleImageChange}
        className="hidden"
        id="agent-image-upload"
      />
      <label
        htmlFor="agent-image-upload"
        className="px-4 py-2 bg-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-600 transition"
      >
        {preview ? 'Change Image' : 'Upload Image'}
      </label></div>}
    </div>
  );
}
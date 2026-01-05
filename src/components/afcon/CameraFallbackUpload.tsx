'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface CameraFallbackUploadProps {
    cameraId: 1 | 2 | 3 | 4;
    currentFallbackUrl: string | null;
    isUploading: boolean;
    onUpload: (file: File) => Promise<void>;
    onRemove: () => Promise<void>;
}

export function CameraFallbackUpload({
    cameraId,
    currentFallbackUrl,
    isUploading,
    onUpload,
    onRemove,
}: CameraFallbackUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);

        // Upload
        await onUpload(file);
        setPreviewUrl(null);

        // Clear input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemove = async () => {
        await onRemove();
        setPreviewUrl(null);
    };

    const displayUrl = previewUrl || currentFallbackUrl;

    return (
        <div className="mt-2">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            {displayUrl ? (
                /* Fallback Preview */
                <div className="relative">
                    <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                        <img
                            src={displayUrl}
                            alt={`CAM ${cameraId} fallback`}
                            className="w-full h-full object-cover"
                        />
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                    <div className="flex gap-1 mt-1">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px] text-gray-300 transition-colors disabled:opacity-50"
                        >
                            Replace
                        </button>
                        <button
                            onClick={handleRemove}
                            disabled={isUploading}
                            className="p-1 bg-red-600/80 hover:bg-red-600 rounded transition-colors disabled:opacity-50"
                        >
                            <X className="w-3 h-3 text-white" />
                        </button>
                    </div>
                </div>
            ) : (
                /* Upload Button */
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-[10px] text-gray-400 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <ImageIcon className="w-3 h-3" />
                            Add Fallback
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

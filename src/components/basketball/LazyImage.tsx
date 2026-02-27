'use client';

import { useState } from 'react';
import Image from 'next/image';

interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
    fill?: boolean;
}

export default function LazyImage({ src, alt, className = '', width, height, fill }: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    // If no src, just return a fallback empty div
    if (!src) return <div className={`bg-neutral-800 ${className}`}></div>;

    return (
        <div className={`relative overflow-hidden ${fill ? 'w-full h-full' : ''} ${className}`}>
            {/* Native Next.js Image with unoptimized flag (to support unknown domains like sports team direct links) */}
            <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                fill={fill}
                className={`transition-all duration-700 ease-in-out ${isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-xl scale-110'
                    } ${fill ? 'object-cover' : ''} w-full h-full`}
                onLoad={() => setIsLoaded(true)}
                unoptimized
            />
        </div>
    );
}

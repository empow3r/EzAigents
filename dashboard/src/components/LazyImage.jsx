import React, { useState, useEffect, useRef } from 'react';

// Ultra-optimized lazy image component
const LazyImage = ({ 
  src, 
  alt = '', 
  className = '',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect width="1" height="1" fill="%23f3f4f6"/%3E%3C/svg%3E',
  sizes = '100vw',
  priority = false 
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    if (priority) {
      // Load immediately for priority images
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Preload image
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
            };
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, placeholder, priority]);

  return (
    <picture ref={imgRef}>
      {/* WebP version */}
      {src && !src.includes('.svg') && (
        <source 
          type="image/webp" 
          srcSet={`${src.replace(/\.(jpg|png)$/, '.webp')}`}
          sizes={sizes}
        />
      )}
      
      {/* AVIF version (even better compression) */}
      {src && !src.includes('.svg') && (
        <source 
          type="image/avif" 
          srcSet={`${src.replace(/\.(jpg|png)$/, '.avif')}`}
          sizes={sizes}
        />
      )}
      
      {/* Fallback */}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </picture>
  );
};

export default LazyImage;
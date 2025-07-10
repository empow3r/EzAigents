import React, { useState, useRef, useEffect } from 'react';
import { useLazyLoad } from '../utils/advancedLazyLoader';

const ResponsiveImage = ({ 
  src, 
  alt, 
  className = '', 
  sizes = '100vw',
  loading = 'lazy',
  placeholder = null,
  aspectRatio = null,
  objectFit = 'cover',
  onLoad = null,
  onError = null,
  priority = false,
  quality = 'auto' // auto, low, medium, high
}) => {
  const [currentSrc, setCurrentSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  
  // Detect optimal image format support
  const supportsWebP = useRef(false);
  const supportsAvif = useRef(false);
  
  useEffect(() => {
    // Check WebP support
    const webpTest = new Image();
    webpTest.onload = () => { supportsWebP.current = true; };
    webpTest.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    
    // Check AVIF support
    const avifTest = new Image();
    avifTest.onload = () => { supportsAvif.current = true; };
    avifTest.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  }, []);
  
  // Generate srcset based on common viewport widths
  const generateSrcSet = (baseSrc) => {
    const widths = [320, 640, 768, 1024, 1280, 1536, 1920];
    const extension = baseSrc.split('.').pop();
    const baseUrl = baseSrc.substring(0, baseSrc.lastIndexOf('.'));
    
    // Determine quality multiplier
    const qualityMultipliers = {
      'low': 0.6,
      'medium': 0.8,
      'high': 1,
      'auto': getAutoQuality()
    };
    
    const qualityMultiplier = qualityMultipliers[quality] || 1;
    
    return widths
      .map(width => {
        const adjustedWidth = Math.round(width * qualityMultiplier);
        return `${baseUrl}-${adjustedWidth}w.${extension} ${width}w`;
      })
      .join(', ');
  };
  
  const getAutoQuality = () => {
    // Adjust quality based on connection speed
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const effectiveType = connection.effectiveType;
      
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          return 0.5;
        case '3g':
          return 0.7;
        case '4g':
        default:
          return 1;
      }
    }
    return 1;
  };
  
  // Generate picture sources for modern formats
  const generatePictureSources = (baseSrc) => {
    const sources = [];
    const baseUrl = baseSrc.substring(0, baseSrc.lastIndexOf('.'));
    
    if (supportsAvif.current) {
      sources.push({
        type: 'image/avif',
        srcSet: generateSrcSet(`${baseUrl}.avif`)
      });
    }
    
    if (supportsWebP.current) {
      sources.push({
        type: 'image/webp',
        srcSet: generateSrcSet(`${baseUrl}.webp`)
      });
    }
    
    return sources;
  };
  
  // Lazy loading logic
  const isVisible = useLazyLoad(containerRef, () => {
    if (!priority && !isLoaded) {
      setCurrentSrc(src);
    }
  }, {
    rootMargin: priority ? '1000px' : '50px',
    threshold: 0.01
  });
  
  // Priority loading
  useEffect(() => {
    if (priority && !isLoaded) {
      setCurrentSrc(src);
    }
  }, [priority, src, isLoaded]);
  
  const handleLoad = (e) => {
    setIsLoaded(true);
    setHasError(false);
    if (onLoad) onLoad(e);
  };
  
  const handleError = (e) => {
    setHasError(true);
    setIsLoaded(false);
    if (onError) onError(e);
    
    // Fallback to placeholder or show error state
    if (placeholder && currentSrc !== placeholder) {
      setCurrentSrc(placeholder);
    }
  };
  
  // Calculate responsive sizes based on container
  const calculateSizes = () => {
    if (sizes !== '100vw') return sizes;
    
    // Common responsive breakpoints
    return `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw`;
  };
  
  const containerStyle = {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    ...(aspectRatio && {
      aspectRatio,
      height: 'auto'
    })
  };
  
  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit,
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    ...(hasError && { filter: 'grayscale(1) opacity(0.5)' })
  };
  
  const sources = generatePictureSources(src);
  const srcSet = generateSrcSet(src);
  
  return (
    <div ref={containerRef} className={`responsive-image-container ${className}`} style={containerStyle}>
      {/* Placeholder/Loading state */}
      {!isLoaded && placeholder && (
        <img
          src={placeholder}
          alt=""
          className="responsive-image-placeholder"
          style={{
            ...imageStyle,
            opacity: 1,
            filter: 'blur(10px)',
            transform: 'scale(1.1)'
          }}
          aria-hidden="true"
        />
      )}
      
      {/* Main image with picture element for format selection */}
      {(currentSrc || priority) && (
        <picture>
          {sources.map((source, index) => (
            <source
              key={index}
              type={source.type}
              srcSet={source.srcSet}
              sizes={calculateSizes()}
            />
          ))}
          <img
            ref={imgRef}
            src={currentSrc || src}
            srcSet={srcSet}
            sizes={calculateSizes()}
            alt={alt}
            loading={priority ? 'eager' : loading}
            decoding={priority ? 'sync' : 'async'}
            onLoad={handleLoad}
            onError={handleError}
            className="responsive-image"
            style={imageStyle}
          />
        </picture>
      )}
      
      {/* Loading indicator */}
      {!isLoaded && !placeholder && (
        <div className="responsive-image-loader" aria-hidden="true">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 w-full h-full" />
        </div>
      )}
      
      {/* Error state */}
      {hasError && !placeholder && (
        <div className="responsive-image-error flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
};

// Optimized gallery component using ResponsiveImage
export const ResponsiveImageGallery = ({ images, columns = 'auto' }) => {
  const gridStyle = {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: columns === 'auto' 
      ? 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))'
      : `repeat(${columns}, 1fr)`
  };
  
  return (
    <div className="responsive-image-gallery" style={gridStyle}>
      {images.map((image, index) => (
        <ResponsiveImage
          key={image.id || index}
          src={image.src}
          alt={image.alt}
          aspectRatio={image.aspectRatio || '1'}
          placeholder={image.placeholder}
          priority={index < 2} // Prioritize first 2 images
          quality="auto"
        />
      ))}
    </div>
  );
};

export default ResponsiveImage;
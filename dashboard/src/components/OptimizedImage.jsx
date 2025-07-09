'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  createOptimizedImage, 
  createLazyLoader, 
  selectOptimalFormat,
  imagePerformanceMonitor 
} from '../utils/image-optimization';

/**
 * High-performance optimized image component
 * Features: Lazy loading, format optimization, responsive images, error handling
 */
export default function OptimizedImage({
  src,
  alt = '',
  width,
  height,
  className = '',
  priority = false,
  quality = 80,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  fill = false,
  style = {},
  onLoad,
  onError,
  loading = 'lazy',
  crossOrigin,
  referrerPolicy,
  decoding = 'async',
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);
  const loadStartTime = useRef(null);

  // Generate optimized image data
  const optimizedImage = createOptimizedImage(src, {
    quality,
    priority,
    alt,
    sizes: sizes || (fill ? '100vw' : width ? `${width}px` : '100vw')
  });

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (priority || isInView) return;

    const element = imgRef.current;
    if (!element) return;

    const observer = createLazyLoader(element, () => {
      setIsInView(true);
    });

    return () => observer.disconnect();
  }, [priority, isInView]);

  // Optimize image format based on browser support
  useEffect(() => {
    if (!isInView) return;

    const optimizeFormat = async () => {
      try {
        const optimizedSrc = await selectOptimalFormat(src);
        setCurrentSrc(optimizedSrc);
      } catch (error) {
        console.warn('Failed to optimize image format:', error);
        setCurrentSrc(src);
      }
    };

    optimizeFormat();
  }, [src, isInView]);

  // Handle image load
  const handleLoad = useCallback((event) => {
    const loadTime = loadStartTime.current ? Date.now() - loadStartTime.current : 0;
    
    setIsLoaded(true);
    setIsError(false);
    
    // Track performance
    imagePerformanceMonitor.trackImageLoad({
      src: currentSrc,
      loadTime,
      width: event.target.naturalWidth,
      height: event.target.naturalHeight
    });

    onLoad?.(event);
  }, [currentSrc, onLoad]);

  // Handle image error
  const handleError = useCallback((event) => {
    setIsError(true);
    setIsLoaded(false);
    
    // Try fallback to original format
    if (currentSrc !== src) {
      setCurrentSrc(src);
      return;
    }

    onError?.(event);
  }, [currentSrc, src, onError]);

  // Start load timing
  useEffect(() => {
    if (isInView && !isLoaded) {
      loadStartTime.current = Date.now();
    }
  }, [isInView, isLoaded]);

  // Generate blur placeholder
  const generateBlurPlaceholder = () => {
    if (blurDataURL) return blurDataURL;
    
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    
    // Create a simple gradient
    const gradient = ctx.createLinearGradient(0, 0, 10, 10);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 10, 10);
    
    return canvas.toDataURL();
  };

  // Generate picture element with multiple sources
  const renderPicture = () => {
    if (!isInView) {
      return (
        <div
          ref={imgRef}
          className={`${className} bg-gray-200 animate-pulse`}
          style={{
            width: fill ? '100%' : width,
            height: fill ? '100%' : height,
            aspectRatio: width && height ? `${width}/${height}` : undefined,
            ...style
          }}
          aria-label={`Loading ${alt}`}
        />
      );
    }

    return (
      <picture className="block">
        {/* AVIF source */}
        {optimizedImage.srcSets.avif && (
          <source
            srcSet={optimizedImage.srcSets.avif}
            sizes={optimizedImage.sizes}
            type="image/avif"
          />
        )}
        
        {/* WebP source */}
        {optimizedImage.srcSets.webp && (
          <source
            srcSet={optimizedImage.srcSets.webp}
            sizes={optimizedImage.sizes}
            type="image/webp"
          />
        )}
        
        {/* JPEG/PNG fallback */}
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            objectFit: fill ? 'cover' : undefined,
            ...style
          }}
          loading={loading}
          decoding={decoding}
          crossOrigin={crossOrigin}
          referrerPolicy={referrerPolicy}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
        
        {/* Error fallback */}
        {isError && (
          <div
            className={`${className} bg-gray-100 flex items-center justify-center text-gray-400`}
            style={{
              width: fill ? '100%' : width,
              height: fill ? '100%' : height,
              ...style
            }}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        
        {/* Blur placeholder */}
        {placeholder === 'blur' && !isLoaded && !isError && (
          <img
            src={generateBlurPlaceholder()}
            alt=""
            className={`${className} absolute inset-0 w-full h-full object-cover filter blur-sm scale-110`}
            style={{
              ...style,
              zIndex: -1
            }}
            aria-hidden="true"
          />
        )}
      </picture>
    );
  };

  // Fill container wrapper
  if (fill) {
    return (
      <div className="relative w-full h-full overflow-hidden">
        {renderPicture()}
      </div>
    );
  }

  return renderPicture();
}

// High-order component for easy image optimization
export function withImageOptimization(Component) {
  return function OptimizedImageWrapper(props) {
    const { src, ...otherProps } = props;
    
    if (typeof src === 'string' && (src.includes('.jpg') || src.includes('.png') || src.includes('.webp'))) {
      return <OptimizedImage src={src} {...otherProps} />;
    }
    
    return <Component {...props} />;
  };
}

// Preload hook for critical images
export function useImagePreload(imageSources, options = {}) {
  const { priority = 'high' } = options;
  
  useEffect(() => {
    if (!Array.isArray(imageSources) || imageSources.length === 0) return;
    
    const preloadPromises = imageSources.map(src => {
      return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        link.fetchPriority = priority;
        
        link.onload = resolve;
        link.onerror = reject;
        
        document.head.appendChild(link);
        
        // Cleanup
        return () => {
          if (document.head.contains(link)) {
            document.head.removeChild(link);
          }
        };
      });
    });
    
    Promise.allSettled(preloadPromises)
      .then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`Preloaded ${successful}/${imageSources.length} images`);
      });
  }, [imageSources, priority]);
}

// Performance monitoring hook
export function useImagePerformance() {
  const [metrics, setMetrics] = useState({});
  
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(imagePerformanceMonitor.getMetrics());
    };
    
    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update
    
    return () => clearInterval(interval);
  }, []);
  
  return metrics;
}
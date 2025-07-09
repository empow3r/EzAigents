import { useState, useEffect, useCallback, memo, useRef } from 'react';

// Image optimization utilities for better performance
class ImageOptimizer {
  constructor() {
    this.cache = new Map();
    this.loadingImages = new Set();
    this.observers = new Map();
    this.supportedFormats = this.getSupportedFormats();
  }

  // Detect supported image formats
  getSupportedFormats() {
    const formats = {
      webp: false,
      avif: false,
      jpeg2000: false,
      jpegXr: false
    };

    if (typeof window !== 'undefined') {
      // Check WebP support
      const webpCanvas = document.createElement('canvas');
      webpCanvas.width = 1;
      webpCanvas.height = 1;
      formats.webp = webpCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

      // Check AVIF support
      const avifCanvas = document.createElement('canvas');
      avifCanvas.width = 1;
      avifCanvas.height = 1;
      formats.avif = avifCanvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    }

    return formats;
  }

  // Generate optimized image URL
  getOptimizedUrl(src, options = {}) {
    const {
      width = 800,
      height = 600,
      quality = 80,
      format = 'auto',
      fit = 'cover'
    } = options;

    // Return original if not a valid image URL
    if (!src || !this.isImageUrl(src)) {
      return src;
    }

    // Use Next.js Image Optimization API if available
    if (src.startsWith('/') && typeof window !== 'undefined') {
      const params = new URLSearchParams({
        url: src,
        w: width.toString(),
        h: height.toString(),
        q: quality.toString(),
        f: this.getBestFormat(format),
        fit
      });

      return `/_next/image?${params.toString()}`;
    }

    // For external images, use a CDN or return original
    return src;
  }

  // Get best supported format
  getBestFormat(requestedFormat) {
    if (requestedFormat !== 'auto') {
      return requestedFormat;
    }

    if (this.supportedFormats.avif) return 'avif';
    if (this.supportedFormats.webp) return 'webp';
    return 'jpeg';
  }

  // Check if URL is an image
  isImageUrl(url) {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i;
    return imageExtensions.test(url);
  }

  // Preload critical images
  preloadImage(src, options = {}) {
    return new Promise((resolve, reject) => {
      const optimizedSrc = this.getOptimizedUrl(src, options);
      
      if (this.cache.has(optimizedSrc)) {
        resolve(this.cache.get(optimizedSrc));
        return;
      }

      if (this.loadingImages.has(optimizedSrc)) {
        // Wait for existing load to complete
        const checkInterval = setInterval(() => {
          if (this.cache.has(optimizedSrc)) {
            clearInterval(checkInterval);
            resolve(this.cache.get(optimizedSrc));
          }
        }, 100);
        return;
      }

      this.loadingImages.add(optimizedSrc);

      const img = new Image();
      img.onload = () => {
        this.cache.set(optimizedSrc, img);
        this.loadingImages.delete(optimizedSrc);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingImages.delete(optimizedSrc);
        reject(new Error(`Failed to load image: ${optimizedSrc}`));
      };

      img.src = optimizedSrc;
    });
  }

  // Lazy load images with Intersection Observer
  lazyLoadImages(selector = 'img[data-src]') {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      return;
    }

    const images = document.querySelectorAll(selector);
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          
          if (src) {
            this.preloadImage(src, {
              width: img.dataset.width ? parseInt(img.dataset.width) : 800,
              height: img.dataset.height ? parseInt(img.dataset.height) : 600,
              quality: img.dataset.quality ? parseInt(img.dataset.quality) : 80
            })
            .then((loadedImg) => {
              img.src = loadedImg.src;
              img.classList.add('loaded');
              observer.unobserve(img);
            })
            .catch((error) => {
              console.error('Image lazy loading failed:', error);
              observer.unobserve(img);
            });
          }
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1
    });

    images.forEach(img => observer.observe(img));
    
    return () => observer.disconnect();
  }

  // Progressive image loading
  loadProgressively(src, options = {}) {
    const { placeholder = this.generatePlaceholder(options) } = options;
    
    return new Promise((resolve, reject) => {
      // First load a low-quality placeholder
      const placeholderImg = new Image();
      placeholderImg.onload = () => {
        resolve({
          type: 'placeholder',
          src: placeholderImg.src,
          img: placeholderImg
        });

        // Then load the full-quality image
        this.preloadImage(src, options)
          .then(fullImg => {
            resolve({
              type: 'full',
              src: fullImg.src,
              img: fullImg
            });
          })
          .catch(reject);
      };
      
      placeholderImg.src = placeholder;
    });
  }

  // Generate placeholder image
  generatePlaceholder(options = {}) {
    const { width = 800, height = 600, color = '#f0f0f0' } = options;
    
    if (typeof window === 'undefined') {
      return `data:image/svg+xml;base64,${btoa(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${color}"/></svg>`)}`;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL();
  }

  // Compress image client-side
  compressImage(file, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        quality = 0.8,
        maxWidth = 1920,
        maxHeight = 1080,
        format = 'image/jpeg'
      } = options;

      if (typeof window === 'undefined') {
        reject(new Error('Image compression not available on server'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Image compression failed'));
          }
        }, format, quality);
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.loadingImages.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      loadingCount: this.loadingImages.size,
      supportedFormats: this.supportedFormats
    };
  }
}

// React hook for image optimization
export const useImageOptimization = () => {
  const [optimizer] = useState(() => new ImageOptimizer());

  useEffect(() => {
    // Set up lazy loading
    const cleanup = optimizer.lazyLoadImages();
    
    return cleanup;
  }, [optimizer]);

  const optimizeImage = useCallback((src, options) => {
    return optimizer.getOptimizedUrl(src, options);
  }, [optimizer]);

  const preloadImage = useCallback((src, options) => {
    return optimizer.preloadImage(src, options);
  }, [optimizer]);

  const compressImage = useCallback((file, options) => {
    return optimizer.compressImage(file, options);
  }, [optimizer]);

  return {
    optimizeImage,
    preloadImage,
    compressImage,
    getCacheStats: () => optimizer.getCacheStats(),
    clearCache: () => optimizer.clearCache()
  };
};

// Optimized Image component
export const OptimizedImage = memo(({ 
  src, 
  alt, 
  width = 800, 
  height = 600, 
  quality = 80,
  placeholder = true,
  lazy = true,
  className = '',
  ...props 
}) => {
  const { optimizeImage } = useImageOptimization();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  const optimizedSrc = optimizeImage(src, { width, height, quality });

  const handleLoad = () => {
    setLoaded(true);
    setError(false);
  };

  const handleError = () => {
    setError(true);
    setLoaded(false);
  };

  if (lazy) {
    return (
      <div 
        className={`relative overflow-hidden ${className}`}
        style={{ width, height }}
      >
        {placeholder && !loaded && !error && (
          <div 
            className="absolute inset-0 bg-gray-200 animate-pulse"
            style={{ width, height }}
          />
        )}
        <img
          ref={imgRef}
          data-src={optimizedSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          {...props}
        />
      </div>
    );
  }

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      onLoad={handleLoad}
      onError={handleError}
      className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      {...props}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Global image optimizer instance
export const imageOptimizer = new ImageOptimizer();

export default ImageOptimizer;
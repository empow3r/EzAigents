// Image Optimization Utilities for Better Performance
// Handles lazy loading, format optimization, and responsive images

// Supported modern image formats (in order of preference)
const MODERN_FORMATS = ['avif', 'webp', 'jpg', 'png'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB max
const LAZY_LOAD_THRESHOLD = 100; // pixels before viewport

// Image size breakpoints for responsive images
const IMAGE_BREAKPOINTS = {
  xs: 320,   // Mobile portrait
  sm: 640,   // Mobile landscape
  md: 768,   // Tablet
  lg: 1024,  // Desktop
  xl: 1280,  // Large desktop
  '2xl': 1536 // Extra large
};

/**
 * Creates optimized image sources with different formats and sizes
 * @param {string} src - Original image source
 * @param {Object} options - Optimization options
 * @returns {Object} Optimized image data
 */
export function createOptimizedImage(src, options = {}) {
  const {
    sizes = '100vw',
    quality = 80,
    priority = false,
    alt = '',
    formats = MODERN_FORMATS,
    breakpoints = IMAGE_BREAKPOINTS
  } = options;

  // Generate srcSet for different sizes and formats
  const srcSets = {};
  
  formats.forEach(format => {
    const sources = Object.entries(breakpoints).map(([key, width]) => {
      const optimizedSrc = optimizeImageUrl(src, { format, width, quality });
      return `${optimizedSrc} ${width}w`;
    }).join(', ');
    
    srcSets[format] = sources;
  });

  return {
    src: optimizeImageUrl(src, { quality }),
    srcSets,
    sizes,
    alt,
    priority,
    loading: priority ? 'eager' : 'lazy',
    decoding: 'async'
  };
}

/**
 * Optimizes image URL with format, size, and quality parameters
 * @param {string} src - Original image source
 * @param {Object} params - Optimization parameters
 * @returns {string} Optimized image URL
 */
function optimizeImageUrl(src, params = {}) {
  const { format, width, height, quality = 80, fit = 'cover' } = params;
  
  // Check if it's an external URL or local image
  if (src.startsWith('http')) {
    // For external images, return as-is or use image CDN
    return src;
  }
  
  // For local images, construct optimized URL
  const url = new URL(src, window.location.origin);
  const searchParams = new URLSearchParams();
  
  if (format && format !== 'original') {
    searchParams.set('format', format);
  }
  
  if (width) {
    searchParams.set('w', width.toString());
  }
  
  if (height) {
    searchParams.set('h', height.toString());
  }
  
  if (quality !== 80) {
    searchParams.set('q', quality.toString());
  }
  
  if (fit !== 'cover') {
    searchParams.set('fit', fit);
  }
  
  if (searchParams.toString()) {
    url.search = searchParams.toString();
  }
  
  return url.toString();
}

/**
 * Lazy loading implementation using Intersection Observer
 * @param {Element} element - Image element to observe
 * @param {Function} callback - Callback when image enters viewport
 * @returns {IntersectionObserver} Observer instance
 */
export function createLazyLoader(element, callback) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: `${LAZY_LOAD_THRESHOLD}px`,
      threshold: 0.1
    }
  );
  
  observer.observe(element);
  return observer;
}

/**
 * Preloads critical images for better performance
 * @param {Array<string>} imageSrcs - Array of image sources to preload
 * @param {Object} options - Preload options
 */
export function preloadImages(imageSrcs, options = {}) {
  const { priority = 'high', as = 'image' } = options;
  
  imageSrcs.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = as;
    link.href = src;
    link.fetchPriority = priority;
    
    // Add to document head
    document.head.appendChild(link);
  });
}

/**
 * Checks if browser supports a specific image format
 * @param {string} format - Image format to check
 * @returns {Promise<boolean>} Support status
 */
export function supportsImageFormat(format) {
  return new Promise((resolve) => {
    const testImages = {
      avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=',
      webp: 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
    };
    
    if (!(format in testImages)) {
      resolve(false);
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(img.width === 2 && img.height === 2);
    img.onerror = () => resolve(false);
    img.src = testImages[format];
  });
}

/**
 * Optimized image component data
 * @param {string} src - Image source
 * @param {Object} props - Component props
 * @returns {Object} Optimized image props
 */
export function getOptimizedImageProps(src, props = {}) {
  const {
    width,
    height,
    alt = '',
    className = '',
    priority = false,
    quality = 80,
    placeholder = 'blur',
    blurDataURL,
    sizes,
    fill = false
  } = props;

  const optimized = createOptimizedImage(src, {
    quality,
    priority,
    alt,
    sizes: sizes || (fill ? '100vw' : `${width}px`)
  });

  return {
    ...optimized,
    width: fill ? undefined : width,
    height: fill ? undefined : height,
    className,
    placeholder,
    blurDataURL: blurDataURL || generateBlurDataURL(width, height),
    fill
  };
}

/**
 * Generates a blur placeholder data URL
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} Blur data URL
 */
function generateBlurDataURL(width = 100, height = 100) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  
  // Create gradient blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(66, 165, 245, 0.1)');
  gradient.addColorStop(0.5, 'rgba(156, 39, 176, 0.1)');
  gradient.addColorStop(1, 'rgba(103, 58, 183, 0.1)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/png');
}

/**
 * Image loading performance monitor
 */
export class ImagePerformanceMonitor {
  constructor() {
    this.metrics = {
      totalImages: 0,
      loadedImages: 0,
      failedImages: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
      largestContentfulPaint: 0
    };
    
    this.observer = new PerformanceObserver(this.handlePerformanceEntry.bind(this));
    this.observer.observe({ entryTypes: ['element', 'largest-contentful-paint'] });
  }
  
  handlePerformanceEntry(list) {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'element' && entry.element.tagName === 'IMG') {
        this.trackImageLoad(entry);
      } else if (entry.entryType === 'largest-contentful-paint') {
        this.metrics.largestContentfulPaint = entry.startTime;
      }
    }
  }
  
  trackImageLoad(entry) {
    this.metrics.totalImages++;
    this.metrics.totalLoadTime += entry.loadTime;
    this.metrics.averageLoadTime = this.metrics.totalLoadTime / this.metrics.totalImages;
    
    if (entry.loadTime < 1000) { // Consider loaded if under 1s
      this.metrics.loadedImages++;
    } else {
      this.metrics.failedImages++;
    }
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
  
  reset() {
    this.metrics = {
      totalImages: 0,
      loadedImages: 0,
      failedImages: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
      largestContentfulPaint: 0
    };
  }
  
  disconnect() {
    this.observer.disconnect();
  }
}

/**
 * WebP support detection with fallback
 * @returns {Promise<boolean>} WebP support status
 */
export async function detectWebPSupport() {
  if (typeof window === 'undefined') return false;
  
  // Check if already detected
  if (window.__webpSupport !== undefined) {
    return window.__webpSupport;
  }
  
  try {
    const supported = await supportsImageFormat('webp');
    window.__webpSupport = supported;
    return supported;
  } catch {
    window.__webpSupport = false;
    return false;
  }
}

/**
 * AVIF support detection
 * @returns {Promise<boolean>} AVIF support status
 */
export async function detectAVIFSupport() {
  if (typeof window === 'undefined') return false;
  
  if (window.__avifSupport !== undefined) {
    return window.__avifSupport;
  }
  
  try {
    const supported = await supportsImageFormat('avif');
    window.__avifSupport = supported;
    return supported;
  } catch {
    window.__avifSupport = false;
    return false;
  }
}

/**
 * Smart image format selector
 * @param {string} originalSrc - Original image source
 * @returns {Promise<string>} Best supported format URL
 */
export async function selectOptimalFormat(originalSrc) {
  const avifSupport = await detectAVIFSupport();
  const webpSupport = await detectWebPSupport();
  
  if (avifSupport) {
    return optimizeImageUrl(originalSrc, { format: 'avif' });
  } else if (webpSupport) {
    return optimizeImageUrl(originalSrc, { format: 'webp' });
  }
  
  return originalSrc;
}

// Export performance monitor instance
export const imagePerformanceMonitor = new ImagePerformanceMonitor();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    imagePerformanceMonitor.disconnect();
  });
}
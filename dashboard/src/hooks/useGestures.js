import { useState, useEffect, useCallback } from 'react';

export function useGestures() {
  const [gestureState, setGestureState] = useState({
    isGesturing: false,
    gestureType: null,
    direction: null,
    velocity: 0,
    distance: 0
  });

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Minimum distance for swipe detection
  const minSwipeDistance = 50;

  const handleTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    });
    setGestureState(prev => ({ ...prev, isGesturing: true }));
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStart) return;

    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    };

    const deltaX = currentTouch.x - touchStart.x;
    const deltaY = currentTouch.y - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const deltaTime = currentTouch.time - touchStart.time;
    const velocity = distance / deltaTime;

    let direction = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    setGestureState(prev => ({
      ...prev,
      gestureType: 'swipe',
      direction,
      velocity,
      distance
    }));
  }, [touchStart]);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    };

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > minSwipeDistance) {
      let direction;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      const deltaTime = touchEnd.time - touchStart.time;
      const velocity = distance / deltaTime;

      setGestureState(prev => ({
        ...prev,
        gestureType: 'swipe',
        direction,
        velocity,
        distance,
        isGesturing: false
      }));

      // Fire custom event
      window.dispatchEvent(new CustomEvent('gesture', {
        detail: { type: 'swipe', direction, velocity, distance }
      }));
    } else {
      setGestureState(prev => ({ ...prev, isGesturing: false }));
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, minSwipeDistance]);

  // Pinch/zoom gesture handling
  const [touchDistance, setTouchDistance] = useState(0);
  const [initialDistance, setInitialDistance] = useState(0);

  const getTouchDistance = (touches) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStartMulti = useCallback((e) => {
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches);
      setInitialDistance(distance);
      setTouchDistance(distance);
      setGestureState(prev => ({
        ...prev,
        isGesturing: true,
        gestureType: 'pinch'
      }));
    }
  }, []);

  const handleTouchMoveMulti = useCallback((e) => {
    if (e.touches.length === 2 && initialDistance > 0) {
      const distance = getTouchDistance(e.touches);
      const scale = distance / initialDistance;
      
      setTouchDistance(distance);
      setGestureState(prev => ({
        ...prev,
        gestureType: 'pinch',
        scale,
        distance: distance - initialDistance
      }));

      // Fire custom event for real-time pinch
      window.dispatchEvent(new CustomEvent('gesture', {
        detail: { type: 'pinch', scale, distance: distance - initialDistance }
      }));
    }
  }, [initialDistance]);

  const handleTouchEndMulti = useCallback((e) => {
    if (e.touches.length < 2) {
      setGestureState(prev => ({ ...prev, isGesturing: false }));
      setInitialDistance(0);
      setTouchDistance(0);
    }
  }, []);

  // Long press gesture
  const [longPressTimer, setLongPressTimer] = useState(null);
  const longPressDelay = 500; // ms

  const handleLongPressStart = useCallback((e) => {
    const timer = setTimeout(() => {
      setGestureState(prev => ({
        ...prev,
        gestureType: 'longpress',
        isGesturing: true
      }));

      window.dispatchEvent(new CustomEvent('gesture', {
        detail: { type: 'longpress', x: e.clientX, y: e.clientY }
      }));
    }, longPressDelay);

    setLongPressTimer(timer);
  }, [longPressDelay]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setGestureState(prev => ({ ...prev, isGesturing: false }));
  }, [longPressTimer]);

  // Shake gesture (using device motion)
  const [shakeDetection, setShakeDetection] = useState(false);
  const [lastShake, setLastShake] = useState(0);

  const handleDeviceMotion = useCallback((e) => {
    if (!shakeDetection) return;

    const acceleration = e.accelerationIncludingGravity;
    const threshold = 15; // Shake sensitivity
    const timeDifference = Date.now() - lastShake;

    if (timeDifference > 100) { // Debounce
      const force = Math.sqrt(
        acceleration.x * acceleration.x +
        acceleration.y * acceleration.y +
        acceleration.z * acceleration.z
      );

      if (force > threshold) {
        setLastShake(Date.now());
        setGestureState(prev => ({
          ...prev,
          gestureType: 'shake',
          force
        }));

        window.dispatchEvent(new CustomEvent('gesture', {
          detail: { type: 'shake', force }
        }));
      }
    }
  }, [shakeDetection, lastShake]);

  const enableShakeDetection = useCallback(() => {
    setShakeDetection(true);
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }
  }, [handleDeviceMotion]);

  const disableShakeDetection = useCallback(() => {
    setShakeDetection(false);
    window.removeEventListener('devicemotion', handleDeviceMotion);
  }, [handleDeviceMotion]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [longPressTimer, handleDeviceMotion]);

  return {
    gestureState,
    handlers: {
      // Single touch gestures
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      
      // Multi-touch gestures
      onTouchStartMulti: handleTouchStartMulti,
      onTouchMoveMulti: handleTouchMoveMulti,
      onTouchEndMulti: handleTouchEndMulti,
      
      // Long press
      onMouseDown: handleLongPressStart,
      onMouseUp: handleLongPressEnd,
      onMouseLeave: handleLongPressEnd,
      onTouchStart: (e) => {
        handleTouchStart(e);
        handleLongPressStart(e.touches[0]);
      },
      onTouchEnd: (e) => {
        handleTouchEnd(e);
        handleLongPressEnd();
      }
    },
    enableShakeDetection,
    disableShakeDetection
  };
}
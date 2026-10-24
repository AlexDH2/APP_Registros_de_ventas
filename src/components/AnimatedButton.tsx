import React, { useRef, useState } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps } from 'react-native';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  scaleTo?: number;
  debounceMs?: number;
}

export default function AnimatedButton({
  children,
  style,
  scaleTo = 0.96,
  debounceMs = 750,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedButtonProps) {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const lastPressRef = useRef<number>(0);

  const handlePressIn = (e: any) => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
    onPressOut?.(e);
  };

  const handlePress = (e: any) => {
    if (disabled) return;
    const now = Date.now();
    if (debounceMs > 0 && now - lastPressRef.current < debounceMs) {
      // Evitar doble clic accidental dentro de la ventana de debounce
      return;
    }
    lastPressRef.current = now;
    onPress?.(e);
  };

  return (
    <AnimatedTouchable
      activeOpacity={disabled ? 1 : 0.8}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.6 : 1 }, style]}
      {...props}
    >
      {children}
    </AnimatedTouchable>
  );
}

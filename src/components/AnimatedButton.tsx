import React, { useState } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps } from 'react-native';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  scaleTo?: number;
}

export default function AnimatedButton({
  children,
  style,
  scaleTo = 0.96,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedButtonProps) {
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = (e: any) => {
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
    onPressOut?.(e);
  };

  return (
    <AnimatedTouchable
      activeOpacity={0.8}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[{ transform: [{ scale: scaleAnim }] }, style]}
      {...props}
    >
      {children}
    </AnimatedTouchable>
  );
}

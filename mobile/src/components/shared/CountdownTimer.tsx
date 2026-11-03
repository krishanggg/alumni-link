import { useState, useEffect } from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { colors } from '../../theme';

interface CountdownTimerProps {
  targetDate: string;
  /** Lets a caller size and recolor the timer to match its surrounding palette. */
  style?: StyleProp<TextStyle>;
}

function remaining(targetDate: string): string {
  const diff = new Date(targetDate).getTime() - Date.now();

  if (diff <= 0) {
    return 'Expired';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

export function CountdownTimer({ targetDate, style }: CountdownTimerProps) {
  // Seeded synchronously rather than left empty for the effect to fill in —
  // `useEffect` runs after paint, so an empty initial value renders one frame of
  // blank text that pops in and reflows the card.
  const [timeLeft, setTimeLeft] = useState(() => remaining(targetDate));

  useEffect(() => {
    setTimeLeft(remaining(targetDate));
    const interval = setInterval(() => setTimeLeft(remaining(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <Text style={[styles.timer, style]}>{timeLeft}</Text>;
}

const styles = StyleSheet.create({
  timer: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
});

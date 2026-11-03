import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import { colors } from '../theme';

function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
});

export default LoadingScreen;

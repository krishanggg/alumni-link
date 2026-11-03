import { View, Text, StyleSheet } from 'react-native';

import { colors, layout, typography } from '../../theme';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  placeholder?: string;
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateField({
  label,
  value,
  onChange,
  error,
  maximumDate,
  minimumDate,
  placeholder = 'Select a date',
}: DateFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="date"
        value={value}
        min={minimumDate ? toDateString(minimumDate) : undefined}
        max={maximumDate ? toDateString(maximumDate) : undefined}
        aria-label={label}
        aria-invalid={Boolean(error)}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
        style={{
          boxSizing: 'border-box',
          width: '100%',
          height: layout.controlHeight,
          padding: '0 12px',
          border: `1px solid ${error ? colors.error : colors.outlineVariant}`,
          borderRadius: 8,
          background: colors.surfaceContainerLowest,
          color: colors.onSurface,
          fontFamily: 'inherit',
          fontSize: 14,
        }}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginBottom: 4,
  },
  fieldError: {
    ...typography.bodySm,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});

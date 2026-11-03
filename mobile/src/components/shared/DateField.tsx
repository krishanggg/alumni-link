import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { colors, layout, ripple, typography } from '../../theme';

interface DateFieldProps {
  label: string;
  /** ISO calendar date, `YYYY-MM-DD`, or empty string when unset. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  placeholder?: string;
}

// Deliberately not toISOString().slice(0, 10) — that converts to UTC first, so a date
// picked in UTC+8 (Philippines) comes back as the previous day. The backend treats
// birthdate as a plain calendar date, so it must be formatted from local components.
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Mirror of the above: `new Date('2000-01-01')` parses as UTC midnight, which lands on
// the previous day in any negative-offset zone. Build the Date from parts instead.
function fromDateString(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return isNaN(parsed.getTime()) ? null : parsed;
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
  const [isOpen, setIsOpen] = useState(false);

  const selected = fromDateString(value);

  function handleValueChange(_event: unknown, date: Date) {
    // Android dismisses the dialog itself once a value is picked; iOS keeps the inline
    // spinner mounted, so only Android closes here.
    if (Platform.OS !== 'ios') {
      setIsOpen(false);
    }
    onChange(toDateString(date));
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.input, error ? styles.inputError : null]}
        onPress={() => setIsOpen(true)}
        android_ripple={ripple.onLight}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${value || placeholder}`}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value || placeholder}
        </Text>
      </Pressable>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      {isOpen ? (
        <DateTimePicker
          value={selected ?? maximumDate ?? new Date()}
          mode="date"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onValueChange={handleValueChange}
          onDismiss={() => setIsOpen(false)}
        />
      ) : null}

      {isOpen && Platform.OS === 'ios' ? (
        <Pressable
          style={styles.doneButton}
          onPress={() => setIsOpen(false)}
          android_ripple={ripple.onLight}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      ) : null}
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
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    height: layout.controlHeight,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
  },
  inputError: {
    borderColor: colors.error,
  },
  valueText: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
  placeholderText: {
    ...typography.bodySm,
    color: colors.outline,
  },
  fieldError: {
    ...typography.bodySm,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  doneButtonText: {
    ...typography.labelMd,
    color: colors.accent,
  },
});

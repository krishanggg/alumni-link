import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { useActiveSchools } from '../../hooks/useActiveSchools';

import { colors, presets, typography } from '../../theme';

interface SchoolPickerProps {
  value: number | null;
  onChange: (schoolId: number) => void;
  error?: string;
  required?: boolean;
}

export function SchoolPicker({ value, onChange, error, required }: SchoolPickerProps) {
  // Register, Complete Profile and Resubmit each mount one of these. On the
  // reference tier the list is fetched once and the other two render it from
  // cache with no request and no loading row.
  const { schools, isLoading, isError } = useActiveSchools();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>
          School{required ? ' *' : ''}
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.outline} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>
          School{required ? ' *' : ''}
        </Text>
        <Text style={styles.emptyText}>
          Unable to load schools. Please try again later.
        </Text>
      </View>
    );
  }

  if (schools.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>
          School{required ? ' *' : ''}
        </Text>
        <Text style={styles.emptyText}>
          No schools available. Please contact the administrator.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        School{required ? ' *' : ''}
      </Text>
      <View style={[styles.pickerContainer, error ? styles.pickerError : null]}>
        <Picker
          style={styles.picker}
          selectedValue={value ?? undefined}
          onValueChange={(itemValue: number) => onChange(itemValue)}
        >
          <Picker.Item label="Select a school" value={null} />
          {schools.map((school) => (
            <Picker.Item key={school.id} label={school.name} value={school.id} />
          ))}
        </Picker>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 4,
  },
  pickerContainer: {
    ...presets.pickerContainer,
  },
  picker: {
    ...presets.picker,
  },
  pickerError: {
    borderColor: colors.error,
  },
  fieldError: {
    ...typography.labelSm,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  loadingContainer: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    backgroundColor: colors.surfaceContainerLowest,
  },
  emptyText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
});

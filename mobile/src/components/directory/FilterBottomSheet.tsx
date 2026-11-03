import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DirectoryFilterOptions } from '../../types/directory';

import { colors, presets, radius, ripple, typography } from '../../theme';

interface FilterBottomSheetProps {
  visible: boolean;
  filterOptions: DirectoryFilterOptions | null;
  graduationYear: number | undefined;
  section: string | undefined;
  activeFilterCount: number;
  onYearChange: (value: number | undefined) => void;
  onSectionChange: (value: string | undefined) => void;
  onClear: () => void;
  onClose: () => void;
}

export function FilterBottomSheet({
  visible,
  filterOptions,
  graduationYear,
  section,
  activeFilterCount,
  onYearChange,
  onSectionChange,
  onClear,
  onClose,
}: FilterBottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          android_ripple={ripple.onLight}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Filter Directory</Text>
            {activeFilterCount > 0 && (
              <Pressable
                onPress={onClear}
                android_ripple={ripple.onLight}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
              >
                <Text style={styles.clearText}>Clear All</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Graduation Year</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={graduationYear ?? ''}
                onValueChange={(value) =>
                  onYearChange(value === '' ? undefined : Number(value))
                }
                style={styles.picker}
              >
                <Picker.Item label="All Years" value="" />
                {filterOptions?.graduation_years.map((year) => (
                  <Picker.Item key={year} label={String(year)} value={year} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Section / Strand</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={section ?? ''}
                onValueChange={(value) =>
                  onSectionChange(value === '' ? undefined : value)
                }
                style={styles.picker}
              >
                <Picker.Item label="All Sections" value="" />
                {filterOptions?.sections.map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>
          </View>

          <Pressable
            style={styles.applyButton}
            onPress={onClose}
            android_ripple={ripple.onDark}
            accessibilityRole="button"
            accessibilityLabel={
              activeFilterCount > 0 ? `Apply filters (${activeFilterCount})` : 'Done'
            }
          >
            <Text style={styles.applyButtonText}>
              {activeFilterCount > 0
                ? `Apply Filters (${activeFilterCount})`
                : 'Done'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 20,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  clearText: {
    ...typography.labelMd,
    color: colors.accent,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    ...typography.labelSm,
    color: colors.outline,
    marginBottom: 6,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.base,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    color: colors.onSurface,
  },
  applyButton: {
    ...presets.primaryButton,
    marginTop: 8,
    marginBottom: 8,
  },
  applyButtonText: {
    ...presets.primaryButtonText,
  },
});

export default FilterBottomSheet;

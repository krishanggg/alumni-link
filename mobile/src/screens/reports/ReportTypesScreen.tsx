import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ReportsStackParamList } from '../../navigation/ReportsNavigator';
import type { ReportType } from '../../types/report';

import {
  REPORT_TYPES,
  REPORT_TYPE_COLORS,
  REPORT_TYPE_ICONS,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_SUBTITLES,
} from '../../components/reports/reportDisplay';
import Icon from '../../components/shared/Icon';
import { usePrefetchPublishedReports } from '../../hooks/useReports';

import { colors, layout, presets, radius, ripple, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ReportsStackParamList, 'ReportTypes'>;

function ReportTypesScreen({ navigation }: Props) {
  // All four destinations are known before the user picks one, so their first
  // page is fetched while they are still reading this list — selecting a type
  // renders its reports on the first frame instead of resolving a skeleton
  // after navigation lands.
  usePrefetchPublishedReports();

  function openType(reportType: ReportType) {
    navigation.navigate('ReportList', {
      reportType,
      title: REPORT_TYPE_LABELS[reportType],
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.intro}>
        <Text style={styles.title}>Published Reports</Text>
        <Text style={styles.subtitle}>Choose a report type to view files shared with alumni.</Text>
      </View>
      <FlatList
        data={REPORT_TYPES}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => openType(item)}
            android_ripple={ripple.onLight}
            accessibilityRole="button"
            accessibilityLabel={`${REPORT_TYPE_LABELS[item]}. ${REPORT_TYPE_SUBTITLES[item]}`}
          >
            <View style={[styles.iconTile, { backgroundColor: REPORT_TYPE_COLORS[item] }]}>
              <Icon name={REPORT_TYPE_ICONS[item]} size={22} color={colors.onSurfaceVariant} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{REPORT_TYPE_LABELS[item]}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>{REPORT_TYPE_SUBTITLES[item]}</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.outline} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  intro: {
    paddingHorizontal: layout.cardGap,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  list: {
    padding: layout.cardGap,
    gap: spacing.md,
  },
  card: {
    ...presets.card,
    borderRadius: radius.md,
    padding: layout.cardGap,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  cardSubtitle: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
  },
});

export default ReportTypesScreen;

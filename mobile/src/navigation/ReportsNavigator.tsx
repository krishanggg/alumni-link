import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { ReportType } from '../types/report';

import ReportTypesScreen from '../screens/reports/ReportTypesScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';

import { stackScreenOptions } from './stackScreenOptions';

export type ReportsStackParamList = {
  ReportTypes: undefined;
  ReportList: { reportType: ReportType; title: string };
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

function ReportsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen
        name="ReportTypes"
        component={ReportTypesScreen}
        options={{ title: 'Reports' }}
      />
      <Stack.Screen
        name="ReportList"
        component={ReportsScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}

export default ReportsNavigator;

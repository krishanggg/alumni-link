import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';

import { colors } from '../theme';

export type PendingStackParamList = {
  PendingApproval: undefined;
};

const Stack = createNativeStackNavigator<PendingStackParamList>();

function PendingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
    </Stack.Navigator>
  );
}

export default PendingNavigator;

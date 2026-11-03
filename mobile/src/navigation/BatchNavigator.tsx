import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BatchListScreen from '../screens/batches/BatchListScreen';
import BatchDetailScreen from '../screens/batches/BatchDetailScreen';

import { stackScreenOptions } from './stackScreenOptions';

export type BatchStackParamList = {
  BatchList: undefined;
  BatchDetail: { year: number };
};

const Stack = createNativeStackNavigator<BatchStackParamList>();

function BatchNavigator() {
  return (
    <Stack.Navigator
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen
        name="BatchList"
        component={BatchListScreen}
        options={{ title: 'Batch Tracking' }}
      />
      <Stack.Screen
        name="BatchDetail"
        component={BatchDetailScreen}
        options={({ route }) => ({
          title: `Batch ${route.params.year}`,
        })}
      />
    </Stack.Navigator>
  );
}

export default BatchNavigator;

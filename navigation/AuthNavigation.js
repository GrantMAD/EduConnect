import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigation() {
  return (
    <Stack.Navigator initialRouteName="Welcome">
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

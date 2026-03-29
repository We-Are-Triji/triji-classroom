import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/DashboardScreen';
import TaskboardScreen from '../screens/TaskboardScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import FreedomWallScreen from '../screens/FreedomWallScreen';
import GradeCalculatorScreen from '../screens/GradeCalculatorScreen';
import { startAllListeners } from '../utils/firestoreListeners';
import { auth } from '../config/firebaseConfig';
import { brutalShadow, palette } from '../theme/neoBrutal';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  // Start notification listeners when user reaches the main app
  useEffect(() => {
    console.log('TabNavigator mounted - starting notification listeners');

    // Only start listeners if user is authenticated
    if (auth.currentUser) {
      startAllListeners();
    } else {
      console.warn('User not authenticated, cannot start listeners');
    }

    // Listeners are cleaned up in App.js when user logs out
  }, []);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home'; // default icon

          if (!route || !route.name) {
            return <Feather name={iconName} size={size} color={color} />;
          }

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Tasks') {
            iconName = 'clipboard';
          } else if (route.name === 'Announcements') {
            iconName = 'bell';
          } else if (route.name === 'FreedomWall') {
            iconName = 'message-circle';
          } else if (route.name === 'Calculator') {
            iconName = 'divide-square';
          }

          return (
            <Animated.View style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}>
              <Feather name={iconName} size={size} color={color} />
            </Animated.View>
          );
        },
        tabBarActiveTintColor: palette.text,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.mustard,
          borderTopColor: palette.border,
          borderTopWidth: 3,
          height: Platform.OS === 'ios' ? 85 : Math.max(65, 65 + insets.bottom),
          paddingBottom: Platform.OS === 'ios' ? 25 : Math.max(10, insets.bottom),
          paddingTop: 10,
          ...brutalShadow(0, -4),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          textTransform: 'uppercase',
        },
        tabBarHideOnKeyboard: true,
        lazy: true,
        animationEnabled: true,
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Tasks" component={TaskboardScreen} options={{ tabBarLabel: 'Tasks' }} />
      <Tab.Screen
        name="Announcements"
        component={AnnouncementsScreen}
        options={{ tabBarLabel: 'Announce' }}
      />
      <Tab.Screen
        name="FreedomWall"
        component={FreedomWallScreen}
        options={{ tabBarLabel: 'Wall' }}
      />
      <Tab.Screen
        name="Calculator"
        component={GradeCalculatorScreen}
        options={{ tabBarLabel: 'Calc' }}
      />
    </Tab.Navigator>
  );
}

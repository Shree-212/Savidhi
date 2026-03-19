import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabBar } from '../components/shared/TabBar';

// Auth
import { SplashScreen } from '../screens/auth/SplashScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';

// Puja Tab
import { HomeScreen } from '../screens/home/HomeScreen';
import { PujaDetailScreen } from '../screens/puja/PujaDetailScreen';
import { PujaBookingScreen } from '../screens/puja/PujaBookingScreen';
import { ChadhavaDetailScreen } from '../screens/chadhava/ChadhavaDetailScreen';
import { PanchangScreen } from '../screens/panchang/PanchangScreen';
import { PujaStatusScreen } from '../screens/bookings/PujaStatusScreen';

// Temples Tab
import { TempleListScreen } from '../screens/temples/TempleListScreen';
import { TempleDetailScreen } from '../screens/temples/TempleDetailScreen';

// Consult Tab
import { AstrologerListScreen } from '../screens/consult/AstrologerListScreen';
import { AstrologerDetailScreen } from '../screens/consult/AstrologerDetailScreen';
import { BookAppointmentScreen } from '../screens/consult/BookAppointmentScreen';

// Points Tab
import { PointsScreen } from '../screens/points/PointsScreen';

// Profile Tab
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { PujaBookingsScreen } from '../screens/bookings/PujaBookingsScreen';
import { AppointmentBookingsScreen } from '../screens/bookings/AppointmentBookingsScreen';
import { AppointmentStatusScreen } from '../screens/bookings/AppointmentStatusScreen';

/* ── Type Definitions ─────────────────────────────────── */

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  MainTabs: undefined;
};

export type PujaStackParamList = {
  Home: undefined;
  PujaDetail: { pujaId: string };
  PujaBooking: { pujaId: string };
  ChadhavaDetail: { chadhavaId: string };
  Panchang: undefined;
  PujaStatus: { bookingId: string };
};

export type TemplesStackParamList = {
  TempleList: undefined;
  TempleDetail: { templeId: string };
};

export type ConsultStackParamList = {
  AstrologerList: undefined;
  AstrologerDetail: { astrologerId: string };
  BookAppointment: { astrologerId: string };
};

export type PointsStackParamList = {
  Points: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  PujaBookings: undefined;
  AppointmentBookings: undefined;
  PujaStatus: { bookingId: string };
  AppointmentStatus: { bookingId: string };
};

/* ── Navigators ───────────────────────────────────────── */

const RootStack = createNativeStackNavigator<RootStackParamList>();
const PujaStack = createNativeStackNavigator<PujaStackParamList>();
const TemplesStack = createNativeStackNavigator<TemplesStackParamList>();
const ConsultStack = createNativeStackNavigator<ConsultStackParamList>();
const PointsStack = createNativeStackNavigator<PointsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator();

const noHeader = { headerShown: false } as const;

/* ── Tab Stacks ───────────────────────────────────────── */

function PujaTabStack() {
  return (
    <PujaStack.Navigator id="PujaStack" screenOptions={noHeader}>
      <PujaStack.Screen name="Home" component={HomeScreen} />
      <PujaStack.Screen name="PujaDetail" component={PujaDetailScreen} />
      <PujaStack.Screen name="PujaBooking" component={PujaBookingScreen} />
      <PujaStack.Screen name="ChadhavaDetail" component={ChadhavaDetailScreen} />
      <PujaStack.Screen name="Panchang" component={PanchangScreen} />
      <PujaStack.Screen name="PujaStatus" component={PujaStatusScreen} />
    </PujaStack.Navigator>
  );
}

function TemplesTabStack() {
  return (
    <TemplesStack.Navigator id="TemplesStack" screenOptions={noHeader}>
      <TemplesStack.Screen name="TempleList" component={TempleListScreen} />
      <TemplesStack.Screen name="TempleDetail" component={TempleDetailScreen} />
    </TemplesStack.Navigator>
  );
}

function ConsultTabStack() {
  return (
    <ConsultStack.Navigator id="ConsultStack" screenOptions={noHeader}>
      <ConsultStack.Screen name="AstrologerList" component={AstrologerListScreen} />
      <ConsultStack.Screen name="AstrologerDetail" component={AstrologerDetailScreen} />
      <ConsultStack.Screen name="BookAppointment" component={BookAppointmentScreen} />
    </ConsultStack.Navigator>
  );
}

function PointsTabStack() {
  return (
    <PointsStack.Navigator id="PointsStack" screenOptions={noHeader}>
      <PointsStack.Screen name="Points" component={PointsScreen} />
    </PointsStack.Navigator>
  );
}

function ProfileTabStack() {
  return (
    <ProfileStack.Navigator id="ProfileStack" screenOptions={noHeader}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="PujaBookings" component={PujaBookingsScreen} />
      <ProfileStack.Screen name="AppointmentBookings" component={AppointmentBookingsScreen} />
      <ProfileStack.Screen name="PujaStatus" component={PujaStatusScreen} />
      <ProfileStack.Screen name="AppointmentStatus" component={AppointmentStatusScreen} />
    </ProfileStack.Navigator>
  );
}

/* ── Main Tab Navigator ───────────────────────────────── */

function MainTabs() {
  return (
    <Tab.Navigator
      id="MainTabs"
      tabBar={props => <TabBar {...props} />}
      screenOptions={noHeader}
    >
      <Tab.Screen name="PujaTab" component={PujaTabStack} />
      <Tab.Screen name="TemplesTab" component={TemplesTabStack} />
      <Tab.Screen name="ConsultTab" component={ConsultTabStack} />
      <Tab.Screen name="PointsTab" component={PointsTabStack} />
      <Tab.Screen name="ProfileTab" component={ProfileTabStack} />
    </Tab.Navigator>
  );
}

/* ── Root Navigator ───────────────────────────────────── */

export function AppNavigator() {
  return (
    <NavigationContainer>
      <RootStack.Navigator id="RootStack" screenOptions={noHeader}>
        <RootStack.Screen name="Splash" component={SplashScreen} />
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="MainTabs" component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

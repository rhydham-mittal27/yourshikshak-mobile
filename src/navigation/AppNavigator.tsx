import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import IntroScreen from "../screens/IntroScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ParentRegisterScreen from "../screens/ParentRegisterScreen";
import LoginScreen from "../screens/LoginScreen";
import TutorDashboardScreen from "../screens/TutorDashboardScreen";
import TutorProfileScreen from "../screens/TutorProfileScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ClassOpportunitiesScreen from "../screens/ClassOpportunitiesScreen";
import MyDemosScreen from "../screens/MyDemosScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import MyClassesScreen from "../screens/MyClassesScreen";
import TimetableScreen from "../screens/TimetableScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PaymentsScreen from "../screens/PaymentsScreen";
import ParentDashboardScreen from "../screens/ParentDashboardScreen";
import RequestTutorScreen from "../screens/RequestTutorScreen";
import RequestConfirmationScreen from "../screens/RequestConfirmationScreen";
import { ModalProvider } from "../context/ModalContext";
import AppSplashScreen from "../components/AppSplashScreen";
import { setAuthToken, AUTH_STORAGE_KEY, expressInterest, getPendingCycleStarts, PendingCycleClass } from "../api/client";
import { registerForPushNotifications } from "../services/pushNotifications";
import CycleStartModal from "../components/classes/CycleStartModal";
import ClassDetailsScreen from "../screens/ClassDetailsScreen";
import RescheduleClassScreen from "../screens/RescheduleClassScreen";
import PauseClassScreen from "../screens/PauseClassScreen";
import ClassCalendarScreen from "../screens/ClassCalendarScreen";
import GetStartedScreen from "../screens/GetStartedScreen";

export type RootStackParamList = {
  Intro: undefined;
  Register: undefined;
  ParentRegister: undefined;
  Login: { email?: string; teacherId?: string } | undefined;
  RegisterSuccess: { teacherId: string; email: string };
  TutorDashboard: { userId: string; name: string; role: string };
  ParentDashboard: { userId: string; name: string; role: string };
  RequestTutor: { fromDashboard?: boolean } | undefined;
  RequestConfirmation: { requestId: string; subject: string; grade: string };
  ClassDetails: { classId: string };
  RescheduleClass: { classId: string; subject?: string };
  PauseClass: { classId: string; subject?: string };
  ClassCalendar: { classId?: string };
  TutorProfile: undefined;
  Notifications: undefined;
  ClassOpportunities: undefined;
  MyDemos: { highlightId?: string } | undefined;
  EditProfile: undefined;
  MyClasses: { highlightClassId?: string } | undefined;
  Timetable: undefined;
  Settings: undefined;
  Payments: undefined;
  GetStarted: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<
    keyof RootStackParamList | null
  >(null);
  const [savedParams, setSavedParams] = useState<any>(null);
  const [pendingCycles, setPendingCycles] = useState<PendingCycleClass[]>([]);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    (async () => {
      const [raw] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
      try {
        if (raw) {
          const { accessToken, user } = JSON.parse(raw as string);
          setAuthToken(accessToken);
          if (user.role === "TUTOR") {
            registerForPushNotifications();
            setSavedParams({
              userId: user.id,
              name: user.name,
              role: user.role,
            });
            setInitialRoute("TutorDashboard");
            getPendingCycleStarts()
              .then((res) => { if (res.data?.length) setPendingCycles(res.data); })
              .catch(() => {});
            return;
          } else if (user.role === "PARENT") {
            setSavedParams({ userId: user.id, name: user.name, role: user.role });
            setInitialRoute("ParentDashboard");
            registerForPushNotifications().catch(() => {});
            return;
          }
        }
      } catch (_) {}
      setInitialRoute("Intro");
    })();
  }, []);

  // Handle notification action buttons and taps
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { actionIdentifier } = response;
        const data = response.notification.request.content.data as any;

        if (data?.type === "ANNOUNCEMENT") {
          if (actionIdentifier === "EXPRESS_INTEREST") {
            // Fire-and-forget: express interest directly from the notification
            if (data?.announcementId) {
              expressInterest(data.announcementId).catch(() => {});
            }
            return;
          }
          // Default tap or "View Details" — navigate to opportunities
          navRef.current?.navigate("TutorDashboard", savedParams ?? {});
        }

        if (data?.type === "DEMO_ASSIGNED") {
          navRef.current?.navigate("TutorDashboard", savedParams ?? {});
        }

        if (data?.type === "CYCLE_COMPLETE" || data?.type === "DEMO_APPROVED") {
          getPendingCycleStarts()
            .then((res) => { if (res.data?.length) setPendingCycles(res.data); })
            .catch(() => {});
        }

        if (data?.type === "VERIFICATION") {
          navRef.current?.navigate("TutorProfile");
        }

        if (data?.type === "LEAD_UPDATE") {
          // Refresh the parent dashboard so the stepper shows the new stage
          navRef.current?.navigate("ParentDashboard", savedParams ?? {});
        }
      },
    );
    return () => sub.remove();
  }, [savedParams]);

  if (!initialRoute) {
    return <AppSplashScreen />;
  }

  return (
    <ModalProvider>
      {pendingCycles.length > 0 && (
        <CycleStartModal
          classes={pendingCycles}
          onDone={() => setPendingCycles([])}
        />
      )}
      <NavigationContainer ref={navRef}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: "#060D1F" },
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="Intro" component={IntroScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen
            name="ParentRegister"
            component={ParentRegisterScreen}
          />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="TutorDashboard"
            component={TutorDashboardScreen}
            initialParams={savedParams ?? undefined}
          />
          <Stack.Screen
            name="ParentDashboard"
            component={ParentDashboardScreen}
            initialParams={savedParams ?? undefined}
          />
          <Stack.Screen name="TutorProfile" component={TutorProfileScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen
            name="ClassOpportunities"
            component={ClassOpportunitiesScreen}
          />
          <Stack.Screen name="MyDemos" component={MyDemosScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="MyClasses" component={MyClassesScreen} />
          <Stack.Screen name="Timetable" component={TimetableScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Payments" component={PaymentsScreen} />
          <Stack.Screen name="RequestTutor" component={RequestTutorScreen} />
          <Stack.Screen name="RequestConfirmation" component={RequestConfirmationScreen} />
          <Stack.Screen name="ClassDetails" component={ClassDetailsScreen} />
          <Stack.Screen name="RescheduleClass" component={RescheduleClassScreen} />
          <Stack.Screen name="PauseClass" component={PauseClassScreen} />
          <Stack.Screen name="ClassCalendar" component={ClassCalendarScreen} />
          <Stack.Screen name="GetStarted" component={GetStartedScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ModalProvider>
  );
};

export default AppNavigator;

import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  NavigationContainer,
  NavigationContainerRef,
  LinkingOptions,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AuthScreen from "../auth/AuthScreen";
import ForgotPasswordScreen from "../auth/ForgotPasswordScreen";
import RoleSelectScreen from "../auth/RoleSelectScreen";
import TutorCompleteProfileScreen from "../tutor/screens/TutorCompleteProfileScreen";
import ParentCompleteProfileScreen from "../parent/screens/ParentCompleteProfileScreen";
import TutorDashboardScreen from "../tutor/screens/TutorDashboardScreen";
import TutorProfileScreen from "../tutor/screens/TutorProfileScreen";
import NotificationsScreen from "../tutor/screens/NotificationsScreen";
import ClassOpportunitiesScreen from "../tutor/screens/ClassOpportunitiesScreen";
import MyDemosScreen from "../tutor/screens/MyDemosScreen";
import EditProfileScreen from "../tutor/screens/EditProfileScreen";
import MyClassesScreen from "../tutor/screens/MyClassesScreen";
import TimetableScreen from "../tutor/screens/TimetableScreen";
import SettingsScreen from "../tutor/screens/SettingsScreen";
import PaymentsScreen from "../tutor/screens/PaymentsScreen";
import ParentTabNavigator from "./ParentTabNavigator";
import RequestTutorScreen from "../tutor/screens/RequestTutorScreen";
import RequestConfirmationScreen from "../tutor/screens/RequestConfirmationScreen";
import { ModalProvider } from "../context/ModalContext";
import AppSplashScreen from "../shared/components/AppSplashScreen";
import { setAuthToken, AUTH_STORAGE_KEY, expressInterest, getPendingCycleStarts, PendingCycleClass } from "../api/client";
import { registerForPushNotifications } from "../services/pushNotifications";
import CycleStartModal from "../tutor/components/classes/CycleStartModal";
import ClassDetailsScreen from "../tutor/screens/ClassDetailsScreen";
import PauseClassScreen from "../tutor/screens/PauseClassScreen";
import ClassCalendarScreen from "../tutor/screens/ClassCalendarScreen";
import GetStartedScreen from "../auth/GetStartedScreen";
import FAQScreen from "../shared/screens/FAQScreen";
import ParentSettingsScreen from "../parent/screens/ParentSettingsScreen";
import ChildProfileScreen from "../parent/screens/ChildProfileScreen";
import ChildEditProfileScreen from "../parent/screens/ChildEditProfileScreen";
import ParentShiftRequestScreen from "../parent/screens/ParentShiftRequestScreen";
import ParentRescheduleHistoryScreen from "../parent/screens/ParentRescheduleHistoryScreen";
import TutorTestsScreen from "../tutor/screens/TutorTestsScreen";

export type RootStackParamList = {
  Auth: undefined;
  ForgotPassword: { token?: string } | undefined;
  RoleSelect: { name: string; email: string; phone: string; city: string; password: string };
  TutorCompleteProfile: { name: string; email: string; phone: string; city: string; password: string };
  ParentCompleteProfile: { name: string; email: string; phone: string; city: string; password: string };
  TutorDashboard: { userId: string; name: string; role: string };
  ParentDashboard: { userId: string; name: string; role: string };
  RequestTutor: { fromDashboard?: boolean } | undefined;
  RequestConfirmation: { requestId: string; subject: string; grade: string };
  ClassDetails: { classId: string };
  PauseClass: { classId: string; subject?: string };
  ClassCalendar: { classId?: string };
  TutorProfile: { viewerRole?: string } | undefined;
  Notifications: undefined;
  ClassOpportunities: undefined;
  MyDemos: { highlightId?: string } | undefined;
  EditProfile: undefined;
  MyClasses: { highlightClassId?: string } | undefined;
  Timetable: undefined;
  Settings: undefined;
  ParentSettings: undefined;
  ChildProfile: undefined;
  ChildEditProfile: undefined;
  ParentShiftRequest: undefined;
  ParentRescheduleHistory: undefined;
  TutorTests: undefined;
  Payments: undefined;
  GetStarted: undefined;
  FAQ: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["yourshikshak://"],
  config: {
    screens: {
      ForgotPassword: {
        path: "reset-password",
        parse: { token: (token: string) => token },
      },
    },
  },
};

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
      setInitialRoute("Auth");
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
          // Default tap or "View Details" "” navigate to opportunities
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
      <NavigationContainer ref={navRef} linking={linking}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: "#060D1F" },
            gestureEnabled: true,
          }}
        >
          {/* â”€â”€ New unified auth flow â”€â”€ */}
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="TutorCompleteProfile" component={TutorCompleteProfileScreen} />
          <Stack.Screen name="ParentCompleteProfile" component={ParentCompleteProfileScreen} />
          <Stack.Screen
            name="TutorDashboard"
            component={TutorDashboardScreen}
            initialParams={savedParams ?? undefined}
          />
          <Stack.Screen
            name="ParentDashboard"
            component={ParentTabNavigator}
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
          <Stack.Screen name="PauseClass" component={PauseClassScreen} />
          <Stack.Screen name="ParentSettings" component={ParentSettingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChildProfile" component={ChildProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChildEditProfile" component={ChildEditProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ParentShiftRequest" component={ParentShiftRequestScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ParentRescheduleHistory" component={ParentRescheduleHistoryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TutorTests" component={TutorTestsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ClassCalendar" component={ClassCalendarScreen} />
          <Stack.Screen name="GetStarted" component={GetStartedScreen} />
          <Stack.Screen name="FAQ" component={FAQScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ModalProvider>
  );
};

export default AppNavigator;


import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken } from "../api/client";

const isExpoGo = Constants.appOwnership === "expo";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async (): Promise<
  string | null
> => {
  if (isExpoGo || !Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("announcements", {
      name: "Class Announcements",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2D68C4",
      sound: null,
    });
  }

  // Register iOS notification category with Express Interest action button
  if (Platform.OS === "ios") {
    await Notifications.setNotificationCategoryAsync("ANNOUNCEMENT_CATEGORY", [
      {
        identifier: "EXPRESS_INTEREST",
        buttonTitle: "✋ Express Interest",
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
      {
        identifier: "VIEW_ANNOUNCEMENT",
        buttonTitle: "View Details",
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
    ]);
  }

  const tokenData = await Notifications.getDevicePushTokenAsync();
  const token = tokenData.data as string;

  try {
    await registerPushToken(token);
  } catch (_) {}

  return token;
};

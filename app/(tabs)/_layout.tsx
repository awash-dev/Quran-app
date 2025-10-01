import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TabButtonProps {
  label: string;
  isFocused: boolean;
  onPress: () => void;
  icon: (active: boolean) => React.ReactNode;
}

// Tab Button Component (No changes needed)
function TabButton({
  label,
  isFocused,
  onPress,
  icon,
}: TabButtonProps): JSX.Element {
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const opacityAnimation = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnimation, {
        toValue: isFocused ? 1.2 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: isFocused ? 1 : 0.7,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabButton}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ scale: scaleAnimation }], opacity: opacityAnimation },
        ]}
      >
        {isFocused ? (
          <LinearGradient
            colors={["#0D4B26", "#1A936F"]}
            style={styles.gradientCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {icon(true)}
          </LinearGradient>
        ) : (
          <View style={styles.inactiveCircle}>{icon(false)}</View>
        )}
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          {
            color: isFocused ? "#0D4B26" : "#757575",
            opacity: opacityAnimation,
            fontWeight: isFocused ? "bold" : "normal",
          },
        ]}
      >
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// Custom Tab Bar with 4 Icons
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.tabBarContainer, { paddingBottom: insets.bottom || 10 }]}
    >
      <View style={styles.tabBarContent}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = String(
            options.tabBarLabel || options.title || route.name
          );
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented)
              navigation.navigate(route.name);
          };

          const routeName = route.name.toLowerCase();
          let iconRenderer;

          if (routeName.includes("quran")) {
            iconRenderer = (active: boolean) => (
              <Feather
                name="book-open"
                size={26}
                color={active ? "#FFFFFF" : "#0D4B26"}
              />
            );
          } else if (routeName.includes("tasbeeh")) {
            iconRenderer = (active: boolean) => (
              <FontAwesome5
                name="pray"
                size={26}
                color={active ? "#FFFFFF" : "#0D4B26"}
              />
            );
          } else if (routeName.includes("qibla")) {
            iconRenderer = (active: boolean) => (
              <Feather
                name="compass"
                size={26}
                color={active ? "#FFFFFF" : "#0D4B26"}
              />
            );
          } else if (routeName.includes("author")) {
            // THE NEW AUTHOR ICON
            iconRenderer = (active: boolean) => (
              <Feather
                name="user"
                size={26}
                color={active ? "#FFFFFF" : "#0D4B26"}
              />
            );
          } else {
            iconRenderer = (active: boolean) => (
              <Feather
                name="circle"
                size={26}
                color={active ? "#FFFFFF" : "#0D4B26"}
              />
            );
          }

          return (
            <TabButton
              key={route.key}
              label={label}
              isFocused={isFocused}
              onPress={onPress}
              icon={iconRenderer}
            />
          );
        })}
      </View>
    </View>
  );
}

// Main Layout Component (Simplified)
export default function TabLayout({ navigation }: { navigation: any }): JSX.Element {
  return (
    <>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <Tabs
        screenOptions={{
          headerShown: false, // Hide all headers for a clean look
          tabBarShowLabel: false,
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen 
          name="Qibla" 
          options={{ 
            tabBarLabel: "Qibla", 
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('author')}>
                <Ionicons name="menu" size={24} color="#0D4B26" />
              </TouchableOpacity>
            )
          }} 
        />
        <Tabs.Screen 
          name="Quran" 
          options={{ 
            tabBarLabel: "Quran" 
          }} 
        />
        <Tabs.Screen 
          name="Tasbeeh" 
          options={{ 
            tabBarLabel: "Tasbeeh", 
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('author')}>
                <Ionicons name="menu" size={24} color="#0D4B26" />
              </TouchableOpacity>
            )
          }} 
        />
        <Tabs.Screen 
          name="Author" 
          options={{ 
            tabBarLabel: "Author" 
          }} 
        />
      </Tabs>
    </>
  );
}

// Styles
const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: "#F8F8F8",
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabBarContent: {
    flexDirection: "row",
    height: 75,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    margin: 10,
    marginBottom: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    height: "100%",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gradientCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D4B26",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  inactiveCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F7F4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  tabLabel: { fontSize: 12, marginTop: 2 },
});

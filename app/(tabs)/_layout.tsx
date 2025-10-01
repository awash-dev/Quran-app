import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Custom Tab Bar Button with Animation
function TabButton({ label, isFocused, onPress, icon }) {
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const opacityAnimation = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (isFocused) {
      Animated.parallel([
        Animated.timing(scaleAnimation, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 0.7,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
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

// Custom Tab Bar
function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.tabBarContainer, { paddingBottom: insets.bottom || 10 }]}
    >
      <View style={styles.tabBarContent}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Get the icon based on the route name (case-insensitive matching)
          const routeName = route.name.toLowerCase();
          let iconRenderer;
          
          if (routeName.includes('quran')) {
            iconRenderer = (active) => (
              <Feather
                name="book-open"
                size={26}
                color={active ? "#FFFFFF" : "#0D4B26"}
              />
            );
          } else if (routeName.includes('tasbeeh')) {
            iconRenderer = (active) => (
              <FontAwesome5
                name="pray"
                size={26}
                color={active ? "#FFFFFF" : "#0D4B26"}
              />
            );
          } else if (routeName.includes('qibla')) {
            iconRenderer = (active) => (
              <Feather
                name="compass"
                size={26}
                color={active ? "#FFFFFF" : "#0D4B26"}
              />
            );
          } else {
            // Default icon as fallback
            iconRenderer = (active) => (
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

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Remove the header completely for all screens
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="Qibla"
        options={{
          title: "Qibla",
          tabBarLabel: "Qibla",
        }}
      />
      <Tabs.Screen
        name="Quran"
        options={{
          title: "Quran",
          tabBarLabel: "Quran",
        }}
      />
      <Tabs.Screen
        name="Tasbeeh"
        options={{
          title: "Tasbeeh",
          tabBarLabel: "Tasbeeh",
        }}
      />
    </Tabs>
  );
}

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
    position: "relative",
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
  tabLabel: {
    fontSize: 12,
    marginTop: 2,
  },
});
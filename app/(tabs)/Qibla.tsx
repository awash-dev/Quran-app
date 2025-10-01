import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const KAABA_LATITUDE = 21.4225;
const KAABA_LONGITUDE = 39.8262;
const LOCATION_STORAGE_KEY = 'qibla_user_location';

export default function SolatQibla() {
  const insets = useSafeAreaInsets();
  const [subscription, setSubscription] = useState(null);
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [heading, setHeading] = useState(0);
  const [location, setLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calibrating, setCalibrating] = useState(false);
  const compassRef = useRef(null);

  // Load saved location when app starts
  useEffect(() => {
    loadSavedLocation();
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Subscribe to magnetometer when location is available
  useEffect(() => {
    if (location) {
      startMagnetometer();
    }
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [location]);

  // Calculate qibla direction when magnetometer data changes
  useEffect(() => {
    if (location && magnetometerData) {
      calculateHeading();
    }
  }, [magnetometerData, location]);

  const loadSavedLocation = async () => {
    try {
      const savedLocation = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (savedLocation) {
        const parsedLocation = JSON.parse(savedLocation);
        setLocation(parsedLocation);
        calculateQiblaDirection(parsedLocation.coords);
        setLoading(false);
      } else {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Error loading saved location:', error);
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Location permission is required to determine Qibla direction.');
        setLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      // Save location for offline use
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
      
      setLocation(location);
      setAccuracy(location.coords.accuracy);
      calculateQiblaDirection(location.coords);
      setLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setError('Could not determine your location. Please check your GPS settings.');
      setLoading(false);
    }
  };

  const startMagnetometer = async () => {
    try {
      Magnetometer.setUpdateInterval(100);
      const subscription = Magnetometer.addListener((data) => {
        setMagnetometerData(data);
      });
      setSubscription(subscription);
    } catch (error) {
      console.error('Error starting magnetometer:', error);
      setError('Could not access compass. Please check your device settings.');
    }
  };

  const calculateQiblaDirection = (coords) => {
    // Convert to radians
    const lat1 = coords.latitude * (Math.PI / 180);
    const lon1 = coords.longitude * (Math.PI / 180);
    const lat2 = KAABA_LATITUDE * (Math.PI / 180);
    const lon2 = KAABA_LONGITUDE * (Math.PI / 180);

    // Calculate qibla direction using the great circle formula
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    let qibla = Math.atan2(y, x) * (180 / Math.PI);
    
    // Normalize to 0-360
    qibla = (qibla + 360) % 360;
    
    setQiblaDirection(qibla);
  };

  const calculateHeading = () => {
    // Calculate device heading from magnetometer data
    const { x, y, z } = magnetometerData;
    let heading = 0;
    
    // Different calculation based on device orientation and platform
    if (Platform.OS === 'ios') {
      heading = Math.atan2(y, x) * (180 / Math.PI);
    } else {
      heading = Math.atan2(x, y) * (180 / Math.PI);
    }
    
    // Normalize to 0-360
    heading = (heading + 360) % 360;
    
    setHeading(heading);
  };

  const calibrateCompass = () => {
    setCalibrating(true);
    Alert.alert(
      "Calibrate Compass",
      "Please move your device in a figure 8 pattern for a few seconds to calibrate the compass.",
      [{ text: "OK", onPress: () => setCalibrating(false) }]
    );
  };

  const refreshLocation = () => {
    getCurrentLocation();
  };

  // Calculate the compass rotation for the UI
  const compassRotation = -heading;
  const needleRotation = qiblaDirection - heading;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D4B26" />
        <Text style={styles.loadingText}>Determining Qibla direction...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={50} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0D4B26', '#1A936F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top || 45 }]}
      >
        <Text style={styles.headerTitle}>Qibla Direction</Text>
        <Text style={styles.locationText}>
          {location ? 
            `${location.coords.latitude.toFixed(4)}°, ${location.coords.longitude.toFixed(4)}°` : 
            'Location not available'}
        </Text>
      </LinearGradient>

      {/* Compass Container */}
      <View style={styles.compassContainer} ref={compassRef}>
        {/* Compass Rose with Qibla Needle */}
        <Animated.View
          style={[
            styles.compassRose,
            { transform: [{ rotate: `${compassRotation}deg` }] }
          ]}
        >
          <Image
            source={require('@/assets/images/compass-rose.png')}
            style={styles.compassImage}
            resizeMode="contain"
          />
          
          {/* Cardinal directions */}
          <Text style={[styles.direction, styles.north]}>N</Text>
          <Text style={[styles.direction, styles.east]}>E</Text>
          <Text style={[styles.direction, styles.south]}>S</Text>
          <Text style={[styles.direction, styles.west]}>W</Text>
        </Animated.View>

        {/* Qibla Indicator - we'll use a simple triangle */}
        <Animated.View
          style={[
            styles.qiblaIndicator,
            { transform: [{ rotate: `${needleRotation}deg` }] }
          ]}
        >
          <View style={styles.needle}>
            <View style={styles.needlePoint} />
            <View style={styles.needleLine} />
          </View>
        </Animated.View>

        {/* Center decoration */}
        <View style={styles.compassCenter}>
          <LinearGradient
            colors={['#0D4B26', '#1A936F']}
            style={styles.centerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="compass" size={24} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </View>

      {/* Information panel */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoPanelTitle}>Qibla Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Direction:</Text>
          <Text style={styles.infoValue}>{qiblaDirection.toFixed(1)}°</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Accuracy:</Text>
          <Text style={styles.infoValue}>
            {accuracy ? `±${Math.round(accuracy)} meters` : 'Unknown'}
          </Text>
        </View>
        
        {calibrating && (
          <View style={styles.calibrationMessage}>
            <Text style={styles.calibrationText}>
              Calibrating... Move your device in a figure 8 pattern.
            </Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={refreshLocation}
        >
          <Feather name="refresh-cw" size={20} color="#0D4B26" />
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={calibrateCompass}
        >
          <Feather name="compass" size={20} color="#0D4B26" />
          <Text style={styles.actionButtonText}>Calibrate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0D4B26',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0D4B26',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    height: width * 0.8,
    width: width * 0.8,
    alignSelf: 'center',
    position: 'relative',
  },
  compassRose: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  compassImage: {
    width: '100%',
    height: '100%',
  },
  direction: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  north: {
    top: 10,
  },
  east: {
    right: 10,
  },
  south: {
    bottom: 10,
  },
  west: {
    left: 10,
  },
  qiblaIndicator: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  needle: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: '50%', // Half the height of the container
  },
  needlePoint: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0D4B26',
  },
  needleLine: {
    width: 2,
    height: '80%',
    backgroundColor: '#0D4B26',
  },
  compassCenter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  centerGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPanel: {
    margin: 20,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoPanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D4B26',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 15,
    color: '#555555',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  calibrationMessage: {
    backgroundColor: 'rgba(13, 75, 38, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  calibrationText: {
    fontSize: 14,
    color: '#0D4B26',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#0D4B26',
    fontWeight: '500',
  },
});
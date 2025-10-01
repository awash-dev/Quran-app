import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import tasbeehData from '@/assets/tasbeehAll.json';

// Import the types from the JSON data
interface Hadith {
  text: string;
  source: string;
}

interface AdhkarItem {
  id: string;
  name: string;
  arabic: string;
  translation: string;
  virtue: string;
  recommended: number;
  category: string;
  fullText: string;
  history: string;
  hadith: Hadith[];
  isLong?: boolean;
}

// Define the shape of our counts object
interface CountsObject {
  [key: string]: number;
}

// Define storage keys
const TASBEEH_COUNTS_KEY = 'tasbeeh_counts';
const LAST_TASBEEH_KEY = 'last_tasbeeh';

// Constants for storage expiration
const STORAGE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds

// Create a type for our navigation
type RootStackParamList = {
  TasbeehArticle: { item: AdhkarItem };
};

type TasbeehNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TasbeehArticle'>;

// Function to save data with expiration time
const saveWithExpiry = async (key: string, value: any): Promise<void> => {
  try {
    const item = {
      value,
      timestamp: new Date().getTime(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
    console.log(`Saved data for key ${key}`);
  } catch (error) {
    console.error(`Error saving data for key ${key}:`, error);
  }
};

// Function to get data with expiration check
const getWithExpiry = async <T,>(key: string): Promise<T | null> => {
  try {
    const itemStr = await AsyncStorage.getItem(key);
    
    // If the item doesn't exist, return null
    if (!itemStr) {
      return null;
    }
    
    const item = JSON.parse(itemStr);
    const now = new Date().getTime();
    
    // Check if the item is expired (older than 30 minutes)
    if (now - item.timestamp > STORAGE_EXPIRY_TIME) {
      // Item is expired, remove it from storage
      await AsyncStorage.removeItem(key);
      console.log(`Removed expired item: ${key}`);
      return null;
    }
    
    return item.value as T;
  } catch (error) {
    console.error(`Error retrieving data for key ${key}:`, error);
    return null;
  }
};

// Function to clear expired items (can be called periodically)
const clearExpiredItems = async (keys: string[]): Promise<void> => {
  try {
    const now = new Date().getTime();
    
    for (const key of keys) {
      const itemStr = await AsyncStorage.getItem(key);
      if (itemStr) {
        const item = JSON.parse(itemStr);
        if (now - item.timestamp > STORAGE_EXPIRY_TIME) {
          await AsyncStorage.removeItem(key);
          console.log(`Removed expired item: ${key}`);
        }
      }
    }
  } catch (error) {
    console.error('Error clearing expired items:', error);
  }
};

// Extract data from imported JSON
const adhkarData: AdhkarItem[] = tasbeehData.adhkar;

// Main Tasbeeh Component
const TasbeehScreen: React.FC = () => {
  const navigation = useNavigation<TasbeehNavigationProp>();
  const insets = useSafeAreaInsets();
  const [counts, setCounts] = useState<CountsObject>({});
  const [selectedAdhkar, setSelectedAdhkar] = useState<AdhkarItem | null>(null);
  const [countViewVisible, setCountViewVisible] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);
  const [category, setCategory] = useState<string>('all');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const [loading, setLoading] = useState<boolean>(true);

  // Set up status bar
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#0D4B26');
    }
  }, []);

  // Load saved counts when the component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load saved counts
        const savedCounts = await getWithExpiry<CountsObject>(TASBEEH_COUNTS_KEY);
        if (savedCounts) {
          setCounts(savedCounts);
        }
        
        // Load last tasbeeh
        const lastTasbeeh = await getWithExpiry<AdhkarItem>(LAST_TASBEEH_KEY);
        if (lastTasbeeh) {
          setSelectedAdhkar(lastTasbeeh);
          setCountViewVisible(true);
          
          // Set the count based on the saved counts
          setCount(savedCounts?.[lastTasbeeh.id] || 0);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };
    
    loadData();
    
    // Set up periodic cleanup
    const cleanupInterval = setInterval(() => {
      clearExpiredItems([TASBEEH_COUNTS_KEY, LAST_TASBEEH_KEY]);
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Save count when it changes
  useEffect(() => {
    if (selectedAdhkar && !loading) {
      saveCounts();
    }
  }, [counts, loading]);

  // Animation when count increases
  useEffect(() => {
    if (count > 0) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [count]);

  // Function to save counts
  const saveCounts = async (): Promise<void> => {
    try {
      await saveWithExpiry(TASBEEH_COUNTS_KEY, counts);
    } catch (error) {
      console.error('Error saving counts:', error);
      Alert.alert('Error', 'Failed to save your progress');
    }
  };

  // Function to save last tasbeeh
  const saveLastTasbeeh = async (tasbeeh: AdhkarItem): Promise<void> => {
    try {
      await saveWithExpiry(LAST_TASBEEH_KEY, tasbeeh);
    } catch (error) {
      console.error('Error saving last tasbeeh:', error);
    }
  };

  // Handle selecting an adhkar item
  const handleSelectAdhkar = (item: AdhkarItem): void => {
    setSelectedAdhkar(item);
    setCount(counts[item.id] || 0);
    setCountViewVisible(true);
    saveLastTasbeeh(item);
  };

  // Handle counter press to increment count
  const handleCounterPress = (): void => {
    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Vibrate for tactile feedback (shorter, more subtle)
    Vibration.vibrate(10);
    
    const newCount = count + 1;
    setCount(newCount);
    
    // Update the counts object
    const newCounts = { ...counts, [selectedAdhkar!.id]: newCount };
    setCounts(newCounts);
  };

  // Handle reset button press
  const handleReset = (): void => {
    if (!selectedAdhkar) return;
    
    // Reset count for this specific adhkar
    setCount(0);
    
    // Update the counts object
    const newCounts = { ...counts, [selectedAdhkar.id]: 0 };
    setCounts(newCounts);
    
    // Vibrate for feedback
    Vibration.vibrate([0, 30, 30, 30]);
  };

  // Handle back button press
  const handleBack = (): void => {
    setCountViewVisible(false);
  };

  // Filter adhkar by category
  const filterAdhkarByCategory = (): AdhkarItem[] => {
    if (category === 'all') {
      return adhkarData;
    } else {
      return adhkarData.filter(item => item.category === category);
    }
  };

  // Calculate progress for the selected adhkar
  const calculateProgress = (): number => {
    if (!selectedAdhkar) return 0;
    const currentCount = count || 0;
    const target = selectedAdhkar.recommended || 100;
    return Math.min(currentCount / target, 1);
  };

  // Render an adhkar item in the list
  const renderAdhkarItem = ({ item }: { item: AdhkarItem }): JSX.Element => {
    const savedCount = counts[item.id] || 0;
    const progress = savedCount / (item.recommended || 100);
    const progressWidth = `${Math.min(progress * 100, 100)}%`;
    
    return (
      <TouchableOpacity
        style={styles.adhkarItem}
        onPress={() => handleSelectAdhkar(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['rgba(13, 75, 38, 0.05)', 'rgba(13, 75, 38, 0.02)']}
          style={styles.adhkarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.adhkarContent}>
            <View style={styles.adhkarHeader}>
              <Text style={styles.adhkarName}>{item.name}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{savedCount}</Text>
              </View>
            </View>
            
            <Text style={styles.adhkarArabic}>{item.arabic}</Text>
            <Text style={styles.adhkarTranslation}>{item.translation}</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: progressWidth, 
                      backgroundColor: progress >= 1 ? '#4CAF50' : '#0D4B26' 
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {progress >= 1 ? 'Completed' : `${Math.round(progress * 100)}%`}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Render category tabs
  const renderCategoryTabs = (): JSX.Element => {
    const categories = [
      { id: 'all', name: 'All' },
      { id: 'daily', name: 'Daily' },
      { id: 'protection', name: 'Protection' },
      { id: 'special', name: 'Special' },
    ];

    return (
      <View style={styles.categoryTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabsContainer}
          contentContainerStyle={styles.categoryTabsContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryTab,
                category === cat.id && styles.categoryTabActive,
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  category === cat.id && styles.categoryTabTextActive,
                ]}
              >
                {cat.name}
              </Text>
              {category === cat.id && <View style={styles.categoryTabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render the counter view (when a tasbeeh is selected)
  const renderCounterView = (): JSX.Element | null => {
    if (!selectedAdhkar) return null;
    
    const progress = calculateProgress();
    const progressPercent = Math.round(progress * 100);
    
    return (
      <View style={styles.counterContainer}>
        <View style={[styles.counterHeader, { paddingTop: insets.top || 40 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.counterTitleContainer}>
            <Text style={styles.counterTitle}>{selectedAdhkar.name}</Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Feather name="refresh-cw" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.counterScrollView}>
          <View style={styles.adhkarDisplayContainer}>
            <Text style={styles.adhkarDisplayArabic}>{selectedAdhkar.arabic}</Text>
            <Text style={styles.adhkarDisplayTranslation}>{selectedAdhkar.translation}</Text>
          </View>

          <View style={styles.targetInfoContainer}>
            <View style={styles.targetInfoItem}>
              <Text style={styles.targetInfoLabel}>Target</Text>
              <Text style={styles.targetInfoValue}>{selectedAdhkar.recommended}</Text>
            </View>
            <View style={styles.targetInfoDivider} />
            <View style={styles.targetInfoItem}>
              <Text style={styles.targetInfoLabel}>Progress</Text>
              <Text style={styles.targetInfoValue}>{progressPercent}%</Text>
            </View>
          </View>

          <View style={styles.progressBarLarge}>
            <View style={styles.progressBarLargeBackground}>
              <View 
                style={[
                  styles.progressBarLargeFill, 
                  { 
                    width: `${progressPercent}%`, 
                    backgroundColor: progress >= 1 ? '#4CAF50' : '#0D4B26' 
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.virtueContainer}>
            <Text style={styles.virtueTitle}>Virtue:</Text>
            <Text style={styles.virtueText}>{selectedAdhkar.virtue}</Text>
          </View>
        </ScrollView>

        <View style={styles.counterButtonContainer}>
          <Animated.View
            style={[
              styles.countFeedback,
              {
                opacity: opacityAnim,
                transform: [{ translateY: -50 }, { scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.countFeedbackText}>+1</Text>
          </Animated.View>
          
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.counterButton}
              onPress={handleCounterPress}
            >
              <LinearGradient
                colors={['#0D4B26', '#1A936F']}
                style={styles.counterGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.counterInner}>
                  <Text style={styles.counterNumber}>{count}</Text>
                  <Text style={styles.tapToCount}>Tap to count</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  };

  // Render main list screen
  const renderListScreen = (): JSX.Element => (
    <>
      <LinearGradient
        colors={['#0D4B26', '#1A936F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top || 40 }]}
      >
        <Text style={styles.headerTitle}>Digital Tasbeeh</Text>
        <Text style={styles.headerSubtitle}>Islamic Remembrance Counter</Text>
      </LinearGradient>

      {renderCategoryTabs()}

      <FlatList
        data={filterAdhkarByCategory()}
        renderItem={renderAdhkarItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.adhkarList}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
      />
    </>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D4B26" />
      {countViewVisible ? renderCounterView() : renderListScreen()}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#0D4B26',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  categoryTabsWrapper: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryTabsContainer: {
    backgroundColor: '#FFFFFF',
  },
  categoryTabsContent: {
    paddingHorizontal: 15,
  },
  categoryTab: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 15,
    position: 'relative',
  },
  categoryTabActive: {
    backgroundColor: 'transparent',
  },
  categoryTabText: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#0D4B26',
    fontWeight: '700',
  },
  categoryTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 15,
    right: 15,
    height: 3,
    backgroundColor: '#0D4B26',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  adhkarList: {
    padding: 15,
    paddingBottom: 50,
  },
  adhkarItem: {
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  adhkarGradient: {
    borderRadius: 15,
  },
  adhkarContent: {
    padding: 15,
  },
  adhkarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  adhkarName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#0D4B26',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 35,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  adhkarArabic: {
    fontSize: 22,
    color: '#0D4B26',
    marginBottom: 8,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  adhkarTranslation: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    height: 4,
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
    width: 70,
    textAlign: 'right',
  },
  counterContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  counterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#0D4B26',
  },
  backButton: {
    padding: 5,
  },
  counterTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  counterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resetButton: {
    padding: 5,
  },
  counterScrollView: {
    flex: 1,
  },
  adhkarDisplayContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 15,
    marginTop: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  adhkarDisplayArabic: {
    fontSize: 30,
    color: '#0D4B26',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  adhkarDisplayTranslation: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
  targetInfoContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 15,
    marginTop: 0,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    padding: 15,
  },
  targetInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  targetInfoDivider: {
    width: 1,
    backgroundColor: '#EEEEEE',
  },
  targetInfoLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  targetInfoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D4B26',
  },
  progressBarLarge: {
    margin: 15,
    marginTop: 0,
  },
  progressBarLargeBackground: {
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarLargeFill: {
    height: '100%',
    borderRadius: 4,
  },
  virtueContainer: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    marginTop: 10,
    borderRadius: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  virtueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  virtueText: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  counterButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    position: 'relative',
  },
  countFeedback: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  countFeedbackText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0D4B26',
  },
  counterButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  counterGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 5,
  },
  counterInner: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0D4B26',
  },
  tapToCount: {
    fontSize: 12,
    color: '#666666',
    marginTop: 5,
  },
});

export default TasbeehScreen;

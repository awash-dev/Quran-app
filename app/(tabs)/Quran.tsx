import { Feather } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import the Quran data
import quranData from "@/assets/quran.json";

const { width } = Dimensions.get("window");

// Storage keys
const BOOKMARK_STORAGE_KEY = 'quran_bookmark_data';

// Average height for each ayah (helps with scrollToIndex)
const AYAH_AVERAGE_HEIGHT = 150;

export default function QuranScreen() {
  const insets = useSafeAreaInsets();
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("surah-list"); // 'surah-list' or 'read-surah'
  const [bookmark, setBookmark] = useState(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const ayahListRef = useRef(null);
  const surahListRef = useRef(null);
  const initialRenderComplete = useRef(false);

  useEffect(() => {
    // Load Quran data and user preferences
    const loadData = async () => {
      try {
        // Load Quran data
        const surahsList = quranData.surahs || quranData.chapters || quranData;
        setSurahs(surahsList);
        
        // Load bookmark data from AsyncStorage
        const savedBookmark = await AsyncStorage.getItem(BOOKMARK_STORAGE_KEY);
        if (savedBookmark) {
          setBookmark(JSON.parse(savedBookmark));
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Save bookmark to AsyncStorage
  const saveBookmark = async (surahIndex, ayahIndex) => {
    try {
      const bookmarkData = {
        surahIndex,
        ayahIndex,
        surahName: surahs[surahIndex]?.name || `Surah ${surahIndex + 1}`,
        ayahNumber: ayahIndex + 1,
        timestamp: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarkData));
      setBookmark(bookmarkData);
    } catch (error) {
      console.error("Error saving bookmark:", error);
    }
  };

  // Navigate to bookmark
  const goToBookmark = () => {
    if (!bookmark) return;
    
    // Find the surah
    const surah = surahs[bookmark.surahIndex];
    if (!surah) return;
    
    // Set the selected surah
    setSelectedSurah(surah);
    setViewMode("read-surah");
    
    // Set the current ayah index but don't scroll yet
    setCurrentAyahIndex(bookmark.ayahIndex);
  };

  // Handle surah selection
  const handleSurahSelect = (surah, index) => {
    setSelectedSurah(surah);
    setCurrentAyahIndex(0); // Start from the beginning
    setViewMode("read-surah");
    // Reset the initial render flag
    initialRenderComplete.current = false;
  };

  // Handle back to list
  const handleBackToList = () => {
    setViewMode("surah-list");
    setSelectedSurah(null);
  };

  // Handle scroll to index failed
  const handleScrollToIndexFailed = (info) => {
    const { index, highestMeasuredFrameIndex, averageItemLength } = info;
    
    // If we can't find the element, scroll to the closest one we know about
    // and then try to find our target
    setTimeout(() => {
      if (ayahListRef.current) {
        // Scroll to the highest measured item first
        ayahListRef.current.scrollToIndex({
          animated: false,
          index: Math.max(0, highestMeasuredFrameIndex),
        });
        
        // Then after a short delay, try scrolling to our target again
        setTimeout(() => {
          if (ayahListRef.current && index <= highestMeasuredFrameIndex + 20) {
            ayahListRef.current.scrollToIndex({
              animated: true,
              index,
              viewPosition: 0.3,
            });
          }
        }, 100);
      }
    }, 300);
  };

  // Get item layout for FlatList (helps with scrollToIndex)
  const getItemLayout = (data, index) => ({
    length: AYAH_AVERAGE_HEIGHT,
    offset: AYAH_AVERAGE_HEIGHT * index,
    index,
  });

  // This effect will trigger after the reading view is rendered
  useEffect(() => {
    if (viewMode === "read-surah" && currentAyahIndex > 0) {
      // Wait for FlatList to be fully rendered
      const timer = setTimeout(() => {
        if (ayahListRef.current) {
          // Mark initial render as complete
          initialRenderComplete.current = true;
          
          try {
            // First scroll to the top to make sure the list is rendered
            ayahListRef.current.scrollToOffset({ 
              offset: 0, 
              animated: false 
            });
            
            // Then scroll to the bookmark position
            setTimeout(() => {
              if (ayahListRef.current) {
                ayahListRef.current.scrollToIndex({
                  index: currentAyahIndex,
                  animated: true,
                  viewPosition: 0.3,
                });
              }
            }, 300);
          } catch (error) {
            console.error("Error scrolling to index:", error);
          }
        }
      }, 700);
      
      return () => clearTimeout(timer);
    }
  }, [viewMode, selectedSurah]);

  // Handle scrolling state
  const handleScrollBeginDrag = () => {
    setIsScrolling(true);
  };
  
  const handleScrollEndDrag = () => {
    setIsScrolling(false);
  };
  
  const handleMomentumScrollEnd = () => {
    setIsScrolling(false);
  };

  // Handle ayah visibility (for bookmark tracking)
  const handleViewableItemsChanged = ({ viewableItems }) => {
    // Only update the current ayah index if we're not in the middle of scrolling
    // and initial render is complete
    if (!isScrolling && initialRenderComplete.current && viewableItems.length > 0) {
      setCurrentAyahIndex(viewableItems[0].index);
    }
  };

  // Render a surah item in the list
  const renderSurahItem = ({ item, index }) => {
    const surahNumber = item.number || index + 1;
    const surahName = item.name || item.englishName || `Surah ${surahNumber}`;
    const arabicName = item.arabicName || item.name_arabic || "";
    const versesCount = item.ayahs?.length || item.total_verses || 0;
    
    // Check if this surah is bookmarked
    const isBookmarked = bookmark && bookmark.surahIndex === index;
    
    // Extract location (Meccan/Medinan) if available
    const revelationPlace = item.revelationType || item.type || "";
    const isMeccan = revelationPlace.toLowerCase().includes("meccan") || 
                    revelationPlace.toLowerCase().includes("mecca") ||
                    revelationPlace.toLowerCase() === "makki";

    return (
      <TouchableOpacity
        style={[styles.surahItem, isBookmarked && styles.bookmarkedSurah]}
        onPress={() => handleSurahSelect(item, index)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#0D4B26', '#1A936F']}
          style={styles.surahNumberContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.surahNumber}>{surahNumber}</Text>
        </LinearGradient>

        <View style={styles.surahInfo}>
          <Text style={styles.surahName}>{surahName}</Text>
          {arabicName && <Text style={styles.arabicName}>{arabicName}</Text>}
          <View style={styles.surahMetaInfo}>
            <Text style={styles.versesCount}>{versesCount} Verses</Text>
            {revelationPlace && (
              <View style={[styles.revelationBadge, 
                {backgroundColor: isMeccan ? '#FBE9E7' : '#E8F5E9'}]}>
                <Text style={[styles.revelationText, 
                  {color: isMeccan ? '#D84315' : '#2E7D32'}]}>
                  {isMeccan ? 'Meccan' : 'Medinan'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.chevronContainer}>
          {isBookmarked ? (
            <Feather name="bookmark" size={20} color="#0D4B26" />
          ) : (
            <Feather name="chevron-right" size={20} color="#0D4B26" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render a verse (ayah) in the reading view
  const renderAyah = ({ item, index }) => {
    const ayahText = item.text || item.arabic || item;
    const translation = item.translation || item.english || "";
    const ayahNumber = item.number || index + 1;
    
    // Check if this ayah is bookmarked
    const isBookmarked = bookmark && 
                         selectedSurah === surahs[bookmark.surahIndex] && 
                         index === bookmark.ayahIndex;

    return (
      <View 
        style={[styles.ayahContainer, isBookmarked && styles.bookmarkedAyah]}
      >
        <View style={styles.ayahNumberContainer}>
          <Text style={styles.ayahNumber}>{ayahNumber}</Text>
        </View>

        <View style={styles.ayahContent}>
          <Text style={styles.arabicText}>{ayahText}</Text>
          {translation && (
            <Text style={styles.translationText}>{translation}</Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.ayahBookmarkButton}
          onPress={() => {
            // Get current surah index
            const surahIndex = surahs.findIndex(s => s === selectedSurah);
            if (surahIndex !== -1) {
              saveBookmark(surahIndex, index);
            }
          }}
        >
          <Feather 
            name="bookmark" 
            size={20} 
            color={isBookmarked ? "#0D4B26" : "#AAAAAA"} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  // Render the surah reading view
  const renderReadingSurah = () => {
    if (!selectedSurah) return null;

    const surahName = selectedSurah.name || selectedSurah.englishName || "Surah";
    const arabicName = selectedSurah.arabicName || selectedSurah.name_arabic || "";
    const ayahs = selectedSurah.ayahs || selectedSurah.verses || [];

    return (
      <View style={styles.readingContainer}>
        <LinearGradient
          colors={['#0D4B26', '#1A936F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.readingHeader, { paddingTop: insets.top || 45 }]}
        >
          <TouchableOpacity
            onPress={handleBackToList}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.readingTitle}>{surahName}</Text>
            {arabicName && <Text style={styles.readingArabicTitle}>{arabicName}</Text>}
          </View>

          <TouchableOpacity 
            style={styles.bookmarkButton}
            onPress={() => {
              // Get current surah index
              const surahIndex = surahs.findIndex(s => s === selectedSurah);
              if (surahIndex !== -1) {
                saveBookmark(surahIndex, currentAyahIndex);
              }
            }}
          >
            <Feather name="bookmark" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.surahBismillahContainer}>
          <LinearGradient
            colors={["rgba(13, 75, 38, 0.08)", "rgba(13, 75, 38, 0.03)", "transparent"]}
            style={styles.surahBismillah}
          >
            <Text style={styles.bismillahText}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </Text>
            <Text style={styles.bismillahTranslation}>
              In the name of Allah, the Entirely Merciful, the Especially Merciful
            </Text>
          </LinearGradient>
        </View>

        <FlatList
          ref={ayahListRef}
          data={ayahs}
          renderItem={renderAyah}
          keyExtractor={(item, index) => `ayah-${index}`}
          contentContainerStyle={styles.ayahsList}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
            minimumViewTime: 300
          }}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          initialNumToRender={5}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          decelerationRate={0.992}
          scrollEventThrottle={32}
          removeClippedSubviews={true}
          disableScrollViewPanResponder={true}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />
      </View>
    );
  };

  // Render the main screen
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D4B26" />
        <Text style={styles.loadingText}>Loading Quran...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0D4B26" />

      {viewMode === "surah-list" ? (
        <>
          {/* Spacer view for top safe area */}
          <View style={{ height: insets.top, backgroundColor: '#0D4B26' }} />
          
          <FlatList
            ref={surahListRef}
            data={surahs}
            renderItem={renderSurahItem}
            keyExtractor={(item, index) => `surah-${index}`}
            contentContainerStyle={[
              styles.surahList,
              { paddingTop: 15 } // Add more padding to avoid first item being cut off
            ]}
            showsVerticalScrollIndicator={false}
            decelerationRate={0.992}
            scrollEventThrottle={32}
            maxToRenderPerBatch={5}
            windowSize={7}
            removeClippedSubviews={true}
          />
          
          {bookmark && (
            <TouchableOpacity
              style={styles.floatingBookmarkButton}
              onPress={goToBookmark}
            >
              <LinearGradient
                colors={['#0D4B26', '#1A936F']}
                style={styles.floatingButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="bookmark" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </>
      ) : (
        renderReadingSurah()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#0D4B26",
  },
  surahList: {
    paddingHorizontal: 15,
    paddingBottom: 80, // Extra space for floating button
  },
  surahItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    marginBottom: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 3,
  },
  bookmarkedSurah: {
    borderLeftWidth: 4,
    borderLeftColor: "#0D4B26",
  },
  surahNumberContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  surahNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  surahInfo: {
    flex: 1,
  },
  surahName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222222",
  },
  arabicName: {
    fontSize: 21,
    color: "#0D4B26",
    marginTop: 4,
    fontWeight: "600",
    textAlign: "left",
    fontFamily: "System",
  },
  surahMetaInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  versesCount: {
    fontSize: 13,
    color: "#757575",
  },
  revelationBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  revelationText: {
    fontSize: 11,
    fontWeight: "600",
  },
  chevronContainer: {
    padding: 5,
  },
  readingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  readingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  titleContainer: {
    alignItems: "center",
    flex: 1,
  },
  readingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  readingArabicTitle: {
    fontSize: 22,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 3,
    fontFamily: "System",
  },
  bookmarkButton: {
    padding: 8,
  },
  surahBismillahContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
  },
  surahBismillah: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    margin: 10,
  },
  bismillahText: {
    fontSize: 28,
    color: "#0D4B26",
    textAlign: "center",
    fontFamily: "System",
  },
  bismillahTranslation: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginTop: 8,
  },
  ayahsList: {
    padding: 15,
    paddingBottom: 60,
  },
  ayahContainer: {
    flexDirection: "row",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  bookmarkedAyah: {
    backgroundColor: "rgba(13, 75, 38, 0.03)",
    borderRadius: 12,
    padding: 10,
    marginLeft: -10,
    marginRight: -10,
    borderLeftWidth: 3,
    borderLeftColor: "#0D4B26",
  },
  ayahNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 5,
  },
  ayahNumber: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0D4B26",
  },
  ayahContent: {
    flex: 1,
  },
  arabicText: {
    fontSize: 24,
    lineHeight: 46,
    textAlign: "right",
    color: "#333333",
    marginBottom: 12,
    fontFamily: "System",
  },
  translationText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#555555",
  },
  ayahBookmarkButton: {
    padding: 5,
    marginLeft: 5,
    alignSelf: "flex-start",
    marginTop: 5,
  },
  floatingBookmarkButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  floatingButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
});
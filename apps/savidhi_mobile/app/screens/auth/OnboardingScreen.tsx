import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface Slide {
  icon: string;
  title: string;
  body: string;
  color: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'temple-hindu',
    title: 'Sacred Services, at Your Doorstep',
    body: 'Book pujas, chadhavas, and astrology consultations from partnered temples across India.',
    color: Colors.primary,
  },
  {
    icon: 'broadcast',
    title: 'Watch Live & Receive Prasad',
    body: 'Join the ceremony live, hear your Sankalp, and receive blessed prasad at your home.',
    color: Colors.green,
  },
  {
    icon: 'star-circle',
    title: 'Earn Gems & Unlock Achievements',
    body: 'Every booking earns gems. Complete milestones to unlock achievements and rewards.',
    color: Colors.orange,
  },
];

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    try { await AsyncStorage.setItem('onboarding_completed', 'true'); } catch { /* no-op */ }
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={finish}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => `slide-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '22' }]}>
              <Icon name={item.icon} size={72} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.cta} onPress={next}>
        <Text style={styles.ctaText}>{index === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
        <Icon name="arrow-right" size={18} color={Colors.textWhite} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  skip: { position: 'absolute', top: 50, right: 20, zIndex: 1, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  skipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingTop: 120 },
  iconCircle: { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { width: 24, backgroundColor: Colors.primary },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, marginHorizontal: 24, marginBottom: 36, paddingVertical: 14, borderRadius: 16 },
  ctaText: { color: Colors.textWhite, fontSize: 16, fontWeight: '600' },
});

import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { ArrowRight, Star, ArrowLeft } from 'lucide-react-native';
import type { Goal } from './types';
import type { RecommendationResponse, FoodItem } from '../../services/recommendations';
import { useRouter } from 'expo-router';
import FoodDetailModal from './FoodDetailModal';

const { width } = Dimensions.get('window');

interface Props {
  goal: Goal;
  onBack?: () => void;
  recommendations?: RecommendationResponse | null;
  recLoading?: boolean;
}

export default function FeelGoodDetail({ goal, onBack, recommendations, recLoading }: Props) {
  const router = useRouter();
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const handleFoodQuestPress = (foodName: string) => {
    // Navigate to food quest map with the food name
    router.push({
      pathname: '/food-quest-map' as any,
      params: { foodName },
    });
  };

  const handleSmallCardPress = (food: FoodItem) => {
    setSelectedFood(food);
    setModalVisible(true);
  };

  const displaySuperFoods = recommendations?.super_power_foods?.map(f => ({
    name: f.name,
    description: `Grade ${f.grade}`,
    image: f.image_url,
  })) ?? goal.superFoods;

  const sf0 = displaySuperFoods[0] ?? goal.superFoods[0];
  const sf1 = displaySuperFoods[1] ?? goal.superFoods[1];
  const sf2 = displaySuperFoods[2] ?? goal.superFoods[2];

  const tinyHeroFoods = recommendations?.tiny_hero_foods ?? [];
  const tryLessFoods = recommendations?.try_less_foods ?? [];

  // Get full food items for small cards (with explanation data)
  const sf1Full = recommendations?.super_power_foods?.[1] ?? null;
  const sf2Full = recommendations?.super_power_foods?.[2] ?? null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Custom Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft color="#FBC02D" size={28} />
        <Text style={styles.backButtonText}>Back to Goals</Text>
      </TouchableOpacity>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Foods for 😊 {goal.title}</Text>
        <Text style={styles.heroSubtitle}>{goal.description}</Text>
      </View>

      {/* Good Choice Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIndicator, { backgroundColor: '#4CAF50' }]} />
          <Text style={[styles.sectionTitle, { color: '#4CAF50' }]}>Super Power Foods</Text>
        </View>
        <Text style={[styles.infoDescriptionText, { color: '#4CAF50', fontStyle: 'italic' }]}>Foods you love that help you reach your goal!</Text>

        {recLoading ? (
          <ActivityIndicator color="#FBC02D" size="large" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.grid}>
            {displaySuperFoods.map((food, index) => {
              const fullFood = recommendations?.super_power_foods?.[index] ?? null;
              return (
                <TouchableOpacity
                  key={food.name}
                  style={[styles.mainCard, { borderLeftWidth: 4, borderLeftColor: '#4CAF50', padding: 16 }]}
                  onPress={() => handleSmallCardPress({
                    name: food.name,
                    image_url: food.image,
                    grade: '',
                    reason: '',
                    cn_code: '',
                    category: '',
                    ...fullFood,
                  })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
                      <Text style={styles.badgeText}>GOOD CHOICE</Text>
                    </View>
                    <Text style={styles.foodNameLarge}>{food.name}</Text>
                  </View>
                  <View style={[styles.mainImageContainer, { height: 100 }]}>
                    <Image source={{ uri: food.image }} style={styles.mainImage} resizeMode="cover" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Tiny Hero Challenge */}
      {(recLoading || tinyHeroFoods.length > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIndicator, { backgroundColor: '#9C27B0' }]} />
            <Text style={[styles.sectionTitle, { color: '#9C27B0' }]}>Tiny Hero Challenge</Text>
          </View>
          <Text style={styles.challengeSubtitle}>Try these healthy foods — your taste buds might surprise you!</Text>
          {recLoading ? (
            <ActivityIndicator color="#9C27B0" size="large" style={{ marginVertical: 24 }} />
          ) : (
            <View style={styles.grid}>
              {tinyHeroFoods.map((food) => (
                <TouchableOpacity
                  key={food.cn_code}
                  style={[styles.mainCard, { borderLeftWidth: 4, borderLeftColor: '#9C27B0', padding: 16 }]}
                  onPress={() => handleSmallCardPress(food)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: '#9C27B0' }]}>
                      <Text style={styles.badgeText}>HERO CHALLENGE</Text>
                    </View>
                    <Text style={styles.foodNameLarge}>{food.name}</Text>
                  </View>
                  <View style={[styles.mainImageContainer, { height: 100 }]}>
                    <Image source={{ uri: food.image_url }} style={styles.mainImage} resizeMode="cover" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Try Less Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIndicator, { backgroundColor: '#FF8A65' }]} />
          <Text style={[styles.sectionTitle, { color: '#FF8A65' }]}>Try Less</Text>
        </View>
        <Text style={[styles.infoDescriptionText, { color: '#FF8A65', fontStyle: 'italic' }]}>Foods that make it hard to reach your goal.</Text>

        {recLoading ? (
          <ActivityIndicator color="#FFD54F" size="large" style={{ marginVertical: 24 }} />
        ) : tryLessFoods.length > 0 ? (
          <View style={styles.grid}>
            {tryLessFoods.map((food) => (
              <View key={food.cn_code} style={[styles.tryLessItemCard, { padding: 16 }]}>
                <Text style={styles.tryLessFoodName}>{food.name}</Text>
                {food.reason && (
                  <Text style={styles.tryLessExplanation}>{food.reason}</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.tryLessCard}>
            <View style={styles.tryLessContent}>
              <View style={styles.choiceRow}>
                <View style={styles.badImageContainer}>
                  <Image source={{ uri: goal.tryLess.image }} style={styles.badImage} resizeMode="contain" />
                </View>
                <ArrowRight color="#FBC02D" size={24} />
                <View style={styles.goodImageContainer}>
                  <Image source={{ uri: goal.tryLess.alternative.image }} style={styles.goodImage} resizeMode="contain" />
                </View>
              </View>
              <Text style={styles.tipText}>{goal.tryLess.alternative.tip}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Food Detail Modal */}
      <FoodDetailModal
        visible={modalVisible}
        food={selectedFood ? {
          name: selectedFood.name,
          description: `Grade ${selectedFood.grade}`,
          image: selectedFood.image_url,
          explanation: selectedFood.reason,
          cn_code: selectedFood.cn_code,
          category: selectedFood.category,
        } : null}
        onClose={() => setModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFDE7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FBC02D',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FBC02D',
  },
  heroSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#36392c',
    textAlign: 'center',
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIndicator: {
    width: 6,
    height: 32,
    borderRadius: 3,
    backgroundColor: '#FBC02D',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#36392c',
  },
  challengeSubtitle: {
    fontSize: 14,
    color: '#7B1FA2',
    fontWeight: '600',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  infoDescriptionText: {
    fontSize: 14,
    color: '#36392c',
    fontWeight: '600',
    marginBottom: 16,
  },
  grid: {
    gap: 16,
  },
  mainCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#FBC02D',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  foodNameLarge: {
    fontSize: 28,
    fontWeight: '900',
    color: '#36392c',
  },
  mainImageContainer: {
    height: 160,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  smallCard: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  smallImageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 12,
  },
  smallImage: {
    width: '100%',
    height: '100%',
  },
  foodNameSmall: {
    fontSize: 16,
    fontWeight: '900',
    color: '#36392c',
    textAlign: 'center',
  },
  tryLessItemCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tryLessFoodName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#36392c',
    textAlign: 'left',
  },
  tryLessExplanation: {
    fontSize: 14,
    color: '#BF360C',
    fontWeight: '600',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  tryLessCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tryLessContent: {
    alignItems: 'center',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  badImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f1f5f9',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  badImage: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  goodImageContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#FFFDE7',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  goodImage: {
    width: '100%',
    height: '100%',
  },
  tipText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#36392c',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  questButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  questButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  questButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'center',
  },
  questButtonTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
});

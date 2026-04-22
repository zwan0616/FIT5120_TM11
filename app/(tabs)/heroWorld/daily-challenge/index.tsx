import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';

import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/fonts';
import { Spacing } from '@/constants/spacing';
import { Radius } from '@/constants/radius';

import {
  getNextDailyChallenge,
  completeDailyChallenge,
  DailyChallenge,
} from '@/services/dailyChallenge';

export default function DailyChallengeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exclude_id?: string }>();
  
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const loadChallenge = useCallback(async () => {
    try {
      setLoading(true);
      const excludeId = params.exclude_id ? parseInt(params.exclude_id, 10) : undefined;
      const data = await getNextDailyChallenge(excludeId);
      setChallenge(data);
    } catch (error: any) {
      console.error('Failed to load challenge:', error);
      Alert.alert('Error', 'Failed to load daily challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params.exclude_id]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const handleComplete = async () => {
    if (!challenge || completing) return;

    try {
      setCompleting(true);
      const response = await completeDailyChallenge(challenge.id);
      setCompleted(true);
      
      // Show success feedback
      Alert.alert(
        '🎉 Challenge Complete!',
        response.feedback,
        [
          {
            text: 'Awesome!',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to complete challenge:', error);
      Alert.alert('Error', 'Failed to complete challenge. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getImageSource = () => {
    if (!challenge?.image_url) {
      // Fallback image if no image_url is provided
      return require('../../../assets/images/nutriheroes_reading.png');
    }
    
    // Convert backend path to local require
    // Backend returns: /assets/images/strong_Bone_Milk.png
    // We need: ../../../assets/images/strong_Bone_Milk.png
    const imageName = challenge.image_url.split('/').pop()?.replace('.png', '') || 'nutriheroes_reading';
    
    // Map of known images
    const imageMap: Record<string, any> = {
      'strong_Bone_Milk': require('../../../assets/images/strong_Bone_Milk.png'),
      'power_Up_Water': require('../../../assets/images/power_Up_Water.png'),
      'immune_shield_fruit': require('../../../assets/images/immune_shield_fruit.png'),
      'happy_tummy_veggies': require('../../../assets/images/happy_tummy_veggies.png'),
      'sparkling_white_teeth': require('../../../assets/images/sparkling_white_teeth.png'),
      'brain_battery_breakfast': require('../../../assets/images/brain_battery_breakfast.png'),
      'light_body,_no_junk': require('../../../assets/images/light_body,_no_junk.png'),
      'eat_meat_and_eggs': require('../../../assets/images/eat_meat_and_eggs.png'),
      'long-lasting_grains': require('../../../assets/images/long-lasting_grains.png'),
      'eat_fish_for_brain': require('../../../assets/images/eat_fish_for_brain.png'),
      'slow_chew,_happy_tummy': require('../../../assets/images/slow_chew,_happy_tummy.png'),
      'rainbow_plate_hero': require('../../../assets/images/rainbow_plate_hero.png'),
      'strong_heart,_no_fry': require('../../../assets/images/strong_heart,_no_fry.png'),
      'super_strength_greens': require('../../../assets/images/super_strength_greens.png'),
      'smart_brain_nuts': require('../../../assets/images/smart_brain_nuts.png'),
      'early_rest,_sweet_dreams': require('../../../assets/images/early_rest,_sweet_dreams.png'),
    };

    return imageMap[imageName] || require('../../../assets/images/nutriheroes_reading.png');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Challenge...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No challenge available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft color={Colors.on_surface} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Challenge</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Challenge Image */}
        <View style={styles.imageContainer}>
          <Image
            source={getImageSource()}
            style={styles.challengeImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageOverlayText}>🌟</Text>
          </View>
        </View>

        {/* Challenge Content */}
        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>DAILY CHALLENGE</Text>
          </View>

          <Text style={styles.challengeTitle}>{challenge.task_name}</Text>
          
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsLabel}>💡 Your Mission:</Text>
            <Text style={styles.tipsText}>{challenge.tips}</Text>
          </View>

          {!completed ? (
            <TouchableOpacity
              style={[styles.completeButton, completing && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={completing}
              activeOpacity={0.85}
            >
              {completing ? (
                <ActivityIndicator color={Colors.on_primary} />
              ) : (
                <>
                  <CheckCircle color={Colors.on_primary} size={24} style={styles.buttonIcon} />
                  <Text style={styles.completeButtonText}>I Did It!</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBadge}>
              <CheckCircle color={Colors.primary} size={32} />
              <Text style={styles.completedText}>Challenge Completed!</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.on_surface_variant,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    ...Typography.titleLarge,
    color: Colors.on_surface_variant,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  retryButtonText: {
    ...Typography.labelLarge,
    color: Colors.on_primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.titleLarge,
    color: Colors.on_surface,
  },
  placeholder: {
    width: 40,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  challengeImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: Radius.full,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  badge: {
    backgroundColor: Colors.primary_container,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...Typography.labelSmall,
    color: Colors.on_primary_container,
    fontWeight: '600',
  },
  challengeTitle: {
    ...Typography.displaySmall,
    color: Colors.on_surface,
  },
  tipsContainer: {
    backgroundColor: Colors.surface_container_low,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  tipsLabel: {
    ...Typography.titleMedium,
    color: Colors.primary,
  },
  tipsText: {
    ...Typography.bodyLarge,
    color: Colors.on_surface_variant,
    lineHeight: 24,
  },
  completeButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: Spacing.xs,
  },
  completeButtonText: {
    ...Typography.titleLarge,
    color: Colors.on_primary,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary_container,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  completedText: {
    ...Typography.titleLarge,
    color: Colors.on_primary_container,
    fontWeight: '600',
  },
});

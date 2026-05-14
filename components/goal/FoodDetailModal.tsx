/**
 * FoodDetailModal - Modal component for displaying expanded food card details
 * Shows a food item in a large card format with explanation when clicked
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { X, Map } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export interface FoodDetailData {
  name: string;
  description: string;
  image: string;
  explanation?: string;
  cn_code?: number;
  category?: string;
}

interface Props {
  visible: boolean;
  food: FoodDetailData | null;
  onClose: () => void;
}

export default function FoodDetailModal({ visible, food, onClose }: Props) {
  const router = useRouter();

  const handleFoodQuestPress = () => {
    if (food?.name) {
      router.push({
        pathname: '/food-quest-map' as any,
        params: { foodName: food.name },
      });
    }
  };

  if (!food) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header with close button */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SUPER POWER FOOD</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={28} color="#36392c" />
            </TouchableOpacity>
          </View>

          {/* Food Name */}
          <Text style={styles.foodName}>{food.name}</Text>

          {/* Food Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: food.image }} style={styles.image} resizeMode="cover" />
          </View>
          
          {/* Explanation/Reason */}
          {food.explanation && (
            <View style={styles.explanationContainer}>
              <Text style={styles.explanationTitle}>Why it's great:</Text>
              <Text style={styles.explanationText}>{food.explanation}</Text>
            </View>
          )}

          {/* Find This Food Button */}
          <TouchableOpacity
            style={styles.questButton}
            onPress={handleFoodQuestPress}
            activeOpacity={0.7}
          >
            <Map color="#2E7D32" size={18} />
            <Text style={styles.questButtonText}>Find This Food</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#36392c',
    marginBottom: 20,
  },
  imageContainer: {
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  description: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  explanationContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4CAF50',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 15,
    color: '#36392c',
    fontWeight: '600',
    lineHeight: 22,
  },
  questButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 8,
  },
  questButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
});

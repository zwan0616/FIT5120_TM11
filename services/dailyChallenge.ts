/**
 * Daily Challenge API Service
 */

import { getToken } from '@/services/auth';
import { getBackendUrl } from '@/services/api';

export interface DailyChallenge {
  id: number;
  task_name: string;
  tips: string;
  image_url?: string | null;
}

export interface DailyChallengeCompleteResponse {
  id: number;
  task_name: string;
  feedback: string;
}

const BACKEND_URL = getBackendUrl();

/**
 * Fetch the next daily challenge from the backend
 */
export async function getNextDailyChallenge(excludeId?: number): Promise<DailyChallenge> {
  try {
    const token = await getToken();
    const url = new URL(`${BACKEND_URL}/daily-challenge/next`);
    
    if (excludeId) {
      url.searchParams.set('exclude_id', excludeId.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch daily challenge');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error fetching daily challenge:', error);
    throw error;
  }
}

/**
 * Complete a daily challenge
 */
export async function completeDailyChallenge(challengeId: number): Promise<DailyChallengeCompleteResponse> {
  try {
    const token = await getToken();

    const response = await fetch(`${BACKEND_URL}/daily-challenge/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: challengeId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to complete challenge');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error completing daily challenge:', error);
    throw error;
  }
}

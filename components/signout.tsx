import { Pressable, Alert, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { destroyDatabase } from '../lib/db';

export default function Signout() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            await signOut();
            destroyDatabase();
            router.replace('/sign-in');
          } catch (error) {
            console.error('Sign out error:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  }, [signOut, router]);

  if (isLoading) {
    return (
      <Pressable className="p-2" disabled>
        <ActivityIndicator size="small" color="#DC2626" />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handleSignOut} className="p-2">
      <Ionicons name="log-out-outline" size={30} color="#DC2626" />
    </Pressable>
  );
}

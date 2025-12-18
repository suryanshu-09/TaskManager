import { Text, View, Image, ActivityIndicator, Pressable } from 'react-native';
import Signout from './signout';

interface HeaderProps {
  isSyncing?: boolean;
  pendingCount?: number;
  isConnected?: boolean;
  onManualSync?: () => void;
}

export default function Header({
  isSyncing = false,
  pendingCount = 0,
  isConnected = true,
  onManualSync,
}: HeaderProps) {
  return (
    <View className="flex flex-col border-b border-gray-200 bg-white shadow-sm">
      <View className="flex flex-row items-center justify-between px-4 py-4">
        <Image source={require('../assets/logo.png')} className="h-10 w-10" resizeMode="contain" />
        <Text className="text-xl font-bold text-[#4F79DB]">Task Manager</Text>
        <Signout />
      </View>

      {/* Sync Status Bar */}
      <View className="flex flex-row items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2">
        <View className="flex flex-row items-center space-x-2">
          {isSyncing ? (
            <>
              <ActivityIndicator size="small" color="#4F79DB" />
              <Text className="text-sm text-gray-600">Syncing...</Text>
            </>
          ) : !isConnected ? (
            <>
              <View className="h-2 w-2 rounded-full bg-red-500" />
              <Text className="text-sm text-gray-600">Offline</Text>
            </>
          ) : pendingCount > 0 ? (
            <>
              <View className="h-2 w-2 rounded-full bg-yellow-500" />
              <Text className="text-sm text-gray-600">{pendingCount} pending</Text>
            </>
          ) : (
            <>
              <View className="h-2 w-2 rounded-full bg-green-500" />
              <View className="w-1" />
              <Text className="text-sm text-gray-600">Synced</Text>
            </>
          )}
        </View>

        {pendingCount > 0 && isConnected && !isSyncing && onManualSync && (
          <Pressable
            onPress={onManualSync}
            className="rounded bg-[#4F79DB] px-3 py-1 active:bg-[#3D5FA8]">
            <Text className="text-xs font-medium text-white">Sync Now</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

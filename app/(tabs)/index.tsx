import { View, Text, FlatList, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Header from 'components/header';
import TaskItem from 'components/task-item';
import { useTasks } from '../../hooks/useTasks';

export default function Home() {
  const {
    tasks,
    allTasks,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    isSyncing,
    pendingCount,
    isConnected,
    syncError,
    loadTasks,
    triggerSync,
  } = useTasks();

  const handleRefresh = useCallback(() => {
    loadTasks(false);
    if (isConnected) {
      triggerSync();
    }
  }, [loadTasks, isConnected, triggerSync]);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#4F79DB" />
          <Text className="mt-4 text-base text-gray-500">Loading tasks...</Text>
        </View>
      );
    }

    if (error || syncError) {
      return (
        <View className="flex-1 items-center justify-center px-8 py-20">
          <Text className="text-5xl">⚠️</Text>
          <Text className="mt-4 text-center text-lg font-medium text-gray-700">
            {error || syncError}
          </Text>
          <Text className="mt-4 text-base text-[#4F79DB]" onPress={() => loadTasks()}>
            Tap to retry
          </Text>
        </View>
      );
    }

    if (searchQuery.trim()) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-5xl">🔍</Text>
          <Text className="mt-4 text-xl font-semibold text-gray-700">No results found</Text>
          <Text className="mt-2 text-center text-base text-gray-500">
            No tasks match "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-5xl">📝</Text>
        <Text className="mt-4 text-xl font-semibold text-gray-700">No tasks yet</Text>
        <Text className="mt-2 text-center text-base text-gray-500">
          Tap the + button to create your first task
        </Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-gray-50">
        <Header
          isSyncing={isSyncing}
          pendingCount={pendingCount}
          isConnected={isConnected ?? false}
        />

        {/* Search Bar */}
        <View className="mx-4 mb-3 mt-2">
          <View className="flex-row items-center rounded-lg border border-gray-300 bg-white px-3 py-2">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              className="ml-2 flex-1 text-base text-gray-900"
              placeholder="Search tasks..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <Text className="text-sm text-gray-500">
                {tasks.length}/{allTasks.length}
              </Text>
            ) : null}
          </View>
        </View>

        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggle={() => loadTasks(false)}
              onDelete={() => loadTasks(false)}
            />
          )}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={renderEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing}
              onRefresh={handleRefresh}
              colors={['#4F79DB']}
              tintColor="#4F79DB"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </GestureHandlerRootView>
  );
}

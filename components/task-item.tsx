import { View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import type { Task } from '../types/task';
import { toggleTaskComplete, deleteTask } from '../lib/tasks';

interface TaskItemProps {
  task: Task;
  onToggle?: () => void;
  onDelete?: () => void;
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const router = useRouter();
  const isCompleted = task.status === 'completed';

  const handleToggle = () => {
    try {
      toggleTaskComplete(task.id);
      onToggle?.();
    } catch (err) {
      Alert.alert('Error', 'Failed to update task. Please try again.');
      console.error('Error toggling task:', err);
    }
  };

  const handlePress = () => {
    router.push(`/task/${task.id}`);
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', `Are you sure you want to delete "${task.title}"?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            deleteTask(task.id);
            onDelete?.();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete task. Please try again.');
            console.error('Error deleting task:', err);
          }
        },
      },
    ]);
  };

  const renderRightActions = () => (
    <Pressable
      onPress={handleDelete}
      className="w-20 items-center justify-center bg-red-500 active:bg-red-600">
      <Text className="text-sm font-semibold text-white">Delete</Text>
    </Pressable>
  );

  const getSyncIndicator = () => {
    if (task.syncStatus === 'pending') {
      return <View className="mr-2 h-2 w-2 rounded-full bg-yellow-500" />;
    }
    if (task.syncStatus === 'conflict') {
      return <View className="mr-2 h-2 w-2 rounded-full bg-red-500" />;
    }
    return null;
  };

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        onPress={handlePress}
        className="flex flex-row items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 active:bg-gray-50">
        <Pressable
          onPress={handleToggle}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
            isCompleted ? 'border-[#4F79DB] bg-[#4F79DB]' : 'border-gray-300'
          }`}>
          {isCompleted && <Text className="text-xs text-white">✓</Text>}
        </Pressable>

        <View className="flex-1">
          <View className="flex-row items-center">
            {getSyncIndicator()}
            <Text
              className={`text-base font-medium ${
                isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
              }`}
              numberOfLines={1}>
              {task.title}
            </Text>
          </View>
          {task.description && (
            <Text
              className={`mt-1 text-sm ${isCompleted ? 'text-gray-300' : 'text-gray-500'}`}
              numberOfLines={2}>
              {task.description}
            </Text>
          )}
        </View>

        <Text className="text-xl text-gray-300">›</Text>
      </Pressable>
    </Swipeable>
  );
}

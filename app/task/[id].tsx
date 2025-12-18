import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getTaskById, updateTask, toggleTaskComplete, deleteTask } from '../../lib/tasks';
import TaskForm from '../../components/task-form';
import type { Task, CreateTaskInput } from '../../types/task';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadTask = () => {
      try {
        setIsLoading(true);
        setError(null);
        if (id) {
          const fetchedTask = getTaskById(id);
          setTask(fetchedTask);
          if (!fetchedTask) {
            setError('Task not found');
          }
        }
      } catch (err) {
        setError('Failed to load task. Please try again.');
        console.error('Error loading task:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTask();
  }, [id]);

  const handleToggleComplete = () => {
    if (!task) return;
    try {
      const updatedTask = toggleTaskComplete(task.id);
      if (updatedTask) {
        setTask(updatedTask);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update task status. Please try again.');
      console.error('Error toggling task:', err);
    }
  };

  const handleSave = async (data: CreateTaskInput) => {
    if (!task) return;
    try {
      setIsSaving(true);
      const updatedTask = updateTask(task.id, {
        title: data.title,
        description: data.description,
      });
      if (updatedTask) {
        setTask(updatedTask);
        setIsEditing(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      console.error('Error saving task:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!task) return;
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              const success = deleteTask(task.id);
              if (success) {
                router.back();
              } else {
                Alert.alert('Error', 'Failed to delete task. Please try again.');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete task. Please try again.');
              console.error('Error deleting task:', err);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F79DB" />
        <Text className="mt-4 text-base text-gray-500">Loading task...</Text>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-5xl">⚠️</Text>
        <Text className="mt-4 text-center text-lg font-medium text-gray-700">
          {error || 'Task not found'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 rounded-lg bg-[#4F79DB] px-6 py-3 active:bg-[#3D5FC7]">
          <Text className="text-base font-semibold text-white">Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (isEditing) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
          <Pressable onPress={handleCancel} disabled={isSaving}>
            <Text className={`text-base ${isSaving ? 'text-gray-400' : 'text-gray-600'}`}>
              Cancel
            </Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Edit Task</Text>
          <View className="w-14" />
        </View>
        <TaskForm
          initialValues={{
            title: task.title,
            description: task.description ?? undefined,
          }}
          onSubmit={handleSave}
          submitLabel={isSaving ? 'Saving...' : 'Save Changes'}
          isSubmitting={isSaving}
        />
      </View>
    );
  }

  const isCompleted = task.status === 'completed';

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSyncStatusText = () => {
    switch (task.syncStatus) {
      case 'pending':
        return 'Pending sync';
      case 'conflict':
        return 'Sync conflict';
      default:
        return 'Synced';
    }
  };

  const getSyncStatusColor = () => {
    switch (task.syncStatus) {
      case 'pending':
        return 'text-yellow-600';
      case 'conflict':
        return 'text-red-600';
      default:
        return 'text-green-600';
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text className="text-base font-medium text-[#4F79DB]">‹ Back</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">Task Details</Text>
        <Pressable
          onPress={() => setIsEditing(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text className="text-base font-medium text-[#4F79DB]">Edit</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Completion Status */}
        <View className="border-b border-gray-100 bg-white px-4 py-4">
          <Pressable
            onPress={handleToggleComplete}
            className="flex-row items-center gap-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <View
              className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
                isCompleted ? 'border-[#4F79DB] bg-[#4F79DB]' : 'border-gray-300'
              }`}>
              {isCompleted && <Text className="text-sm text-white">✓</Text>}
            </View>
            <Text
              className={`text-base font-medium ${isCompleted ? 'text-[#4F79DB]' : 'text-gray-600'}`}>
              {isCompleted ? 'Completed' : 'Mark as complete'}
            </Text>
          </Pressable>
        </View>

        {/* Title */}
        <View className="mt-3 border-b border-gray-100 bg-white px-4 py-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Title
          </Text>
          <Text
            className={`text-lg ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {task.title}
          </Text>
        </View>

        {/* Description */}
        <View className="border-b border-gray-100 bg-white px-4 py-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Description
          </Text>
          <Text
            className={`text-base leading-relaxed ${
              isCompleted
                ? 'text-gray-400'
                : task.description
                  ? 'text-gray-700'
                  : 'italic text-gray-400'
            }`}>
            {task.description || 'No description'}
          </Text>
        </View>

        {/* Last Updated */}
        <View className="mt-3 border-b border-gray-100 bg-white px-4 py-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Last Updated
          </Text>
          <Text className="text-sm text-gray-600">{formatDate(task.lastUpdatedAt)}</Text>
        </View>

        {/* Sync Status */}
        <View className="border-b border-gray-100 bg-white px-4 py-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Sync Status
          </Text>
          <Text className={`text-sm font-medium ${getSyncStatusColor()}`}>
            {getSyncStatusText()}
          </Text>
        </View>

        {/* Delete Button */}
        <View className="mt-8 px-4 pb-8">
          <Pressable
            onPress={handleDelete}
            className="items-center rounded-xl bg-red-500 py-4 shadow-sm active:bg-red-600">
            <Text className="text-base font-semibold text-white">Delete Task</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

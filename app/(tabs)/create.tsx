import { View, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useRef, useCallback } from 'react';
import Header from 'components/header';
import TaskForm from 'components/task-form';
import { createTask } from '../../lib/tasks';
import type { CreateTaskInput } from '../../types/task';

export default function CreateTask() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formKey = useRef(0);

  const handleSubmit = async (data: CreateTaskInput) => {
    try {
      setIsSubmitting(true);
      createTask(data);
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to create task. Please try again.');
      console.error('Error creating task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        formKey.current += 1;
      };
    }, [])
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <TaskForm
        key={formKey.current}
        onSubmit={handleSubmit}
        submitLabel={isSubmitting ? 'Creating...' : 'Create Task'}
        isSubmitting={isSubmitting}
      />
    </View>
  );
}

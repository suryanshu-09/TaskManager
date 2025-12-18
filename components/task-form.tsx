import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import type { CreateTaskInput } from '../types/task';

interface TaskFormProps {
  initialValues?: Partial<CreateTaskInput>;
  onSubmit: (data: CreateTaskInput) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export default function TaskForm({
  initialValues,
  onSubmit,
  submitLabel = 'Save',
  isSubmitting = false,
}: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [errors, setErrors] = useState<{ title?: string }>({});

  const validate = (): boolean => {
    const newErrors: { title?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4">
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">Title *</Text>
            <TextInput
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) setErrors({});
              }}
              placeholder="Enter task title"
              className={`rounded-xl border bg-white px-4 py-3.5 text-base shadow-sm ${
                errors.title ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholderTextColor="#9CA3AF"
              editable={!isSubmitting}
              autoFocus
            />
            {errors.title && <Text className="mt-1.5 text-sm text-red-500">{errors.title}</Text>}
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-gray-700">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Enter task description (optional)"
              multiline
              numberOfLines={4}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base shadow-sm"
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
              style={{ minHeight: 120 }}
              editable={!isSubmitting}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`flex-row items-center justify-center rounded-xl py-4 shadow-sm ${
              isSubmitting ? 'bg-[#8BA3E6]' : 'bg-[#4F79DB] active:bg-[#3D5FC7]'
            }`}>
            {isSubmitting && (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text className="text-base font-semibold text-white">{submitLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

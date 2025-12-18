import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = useCallback(async () => {
    if (!isLoaded) return;

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: unknown) {
      console.error('Sign up error:', err);
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as { errors: { message: string }[] };
        setError(clerkError.errors[0]?.message || 'Sign up failed');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, email, password, confirmPassword, signUp]);

  const handleVerifyEmail = useCallback(async () => {
    if (!isLoaded) return;

    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        console.log('Verification requires additional steps:', result.status);
        setError('Verification incomplete');
      }
    } catch (err: unknown) {
      console.error('Verification error:', err);
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as { errors: { message: string }[] };
        setError(clerkError.errors[0]?.message || 'Verification failed');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, code, signUp, setActive, router]);

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-gray-50">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-6 py-12">
            {/* Header */}
            <View className="mb-8 items-center">
              <Text className="text-3xl font-bold text-gray-800">Verify Email</Text>
              <Text className="mt-2 text-center text-base text-gray-500">
                {"We've sent a verification code to"}
                {'\n'}
                {email}
              </Text>
            </View>

            {/* Error Message */}
            {error && (
              <View className="mb-4 rounded-lg bg-red-50 p-3">
                <Text className="text-center text-sm text-red-600">{error}</Text>
              </View>
            )}

            {/* Verification Code Input */}
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700">Verification Code</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-center text-xl tracking-widest text-gray-800"
                placeholderTextColor="#9CA3AF"
                editable={!isLoading}
              />
            </View>

            {/* Verify Button */}
            <Pressable
              onPress={handleVerifyEmail}
              disabled={isLoading}
              className={`mt-6 rounded-xl py-4 ${isLoading ? 'bg-[#4F79DB]/70' : 'bg-[#4F79DB]'}`}>
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">Verify Email</Text>
              )}
            </Pressable>

            {/* Back Button */}
            <Pressable
              onPress={() => {
                setPendingVerification(false);
                setCode('');
                setError(null);
              }}
              disabled={isLoading}
              className="mt-4">
              <Text className="text-center text-base text-gray-500">Back to Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo */}
          <View className="mb-8 items-center">
            <Image
              source={require('../assets/logo.png')}
              className="mb-4 h-20 w-20"
              resizeMode="contain"
            />
            <Text className="text-3xl font-bold text-gray-800">Create Account</Text>
            <Text className="mt-2 text-base text-gray-500">Sign up to get started</Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="mb-4 rounded-lg bg-red-50 p-3">
              <Text className="text-center text-sm text-red-600">{error}</Text>
            </View>
          )}

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-800"
                placeholderTextColor="#9CA3AF"
                editable={!isLoading}
              />
            </View>

            <View className="mt-4">
              <Text className="mb-2 text-sm font-medium text-gray-700">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-800"
                placeholderTextColor="#9CA3AF"
                editable={!isLoading}
              />
            </View>

            <View className="mt-4">
              <Text className="mb-2 text-sm font-medium text-gray-700">Confirm Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-800"
                placeholderTextColor="#9CA3AF"
                editable={!isLoading}
              />
            </View>

            {/* Sign Up Button */}
            <Pressable
              onPress={handleSignUp}
              disabled={isLoading}
              className={`mt-6 rounded-xl py-4 ${isLoading ? 'bg-[#4F79DB]/70' : 'bg-[#4F79DB]'}`}>
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">Sign Up</Text>
              )}
            </Pressable>
          </View>

          {/* Sign In Link */}
          <View className="mt-8 flex-row items-center justify-center">
            <Text className="text-base text-gray-500">Already have an account? </Text>
            <Link href="/sign-in" asChild>
              <Pressable disabled={isLoading}>
                <Text className="text-base font-semibold text-[#4F79DB]">Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

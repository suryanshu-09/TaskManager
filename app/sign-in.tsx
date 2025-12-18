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
import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSecondFactor, setNeedsSecondFactor] = useState(false);
  const [secondFactorCode, setSecondFactorCode] = useState('');

  const handleSignIn = useCallback(async () => {
    if (!isLoaded) return;

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else if (result.status === 'needs_second_factor') {
        console.log('Sign in requires additional steps: needs_second_factor');

        try {
          await signIn.prepareSecondFactor({
            strategy: 'email_code',
          });
          setNeedsSecondFactor(true);
          setError('A verification code has been sent to your email.');
        } catch (prepareErr) {
          console.error('Prepare second factor error:', prepareErr);
          setNeedsSecondFactor(true);
          setError('A verification code has been sent to your email.');
        }
      } else {
        console.log('Sign in requires additional steps:', result.status);
        setError('Additional verification required');
      }
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as { errors: { message: string }[] };
        setError(clerkError.errors[0]?.message || 'Sign in failed');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, email, password, signIn, setActive, router]);

  const handleSecondFactor = useCallback(async () => {
    if (!isLoaded || !secondFactorCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code: secondFactorCode,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Second factor error:', err);
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as { errors: { message: string }[] };
        setError(clerkError.errors[0]?.message || 'Verification failed');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, secondFactorCode, signIn, setActive, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
          keyboardShouldPersistTaps="handled">
          <View
            className="flex-1 justify-center px-6 py-12"
            style={{ paddingBottom: insets.bottom + 48 }}>
            {/* Logo */}
            <View className="mb-8 items-center">
              <Image
                source={require('../assets/logo.png')}
                className="mb-4 h-20 w-20"
                resizeMode="contain"
              />
              <Text className="text-3xl font-bold text-gray-800">Welcome Back</Text>
              <Text className="mt-2 text-base text-gray-500">Sign in to continue</Text>
            </View>

            {/* Error Message */}
            {error && (
              <View className="mb-4 rounded-lg bg-red-50 p-3">
                <Text className="text-center text-sm text-red-600">{error}</Text>
              </View>
            )}

            {/* Form */}
            <View className="space-y-4">
              {!needsSecondFactor ? (
                <>
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
                      placeholder="Enter your password"
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-800"
                      placeholderTextColor="#9CA3AF"
                      editable={!isLoading}
                    />
                  </View>

                  {/* Sign In Button */}
                  <Pressable
                    onPress={handleSignIn}
                    disabled={isLoading}
                    className={`mt-6 rounded-xl py-4 ${isLoading ? 'bg-[#4F79DB]/70' : 'bg-[#4F79DB]'}`}>
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-center text-base font-semibold text-white">
                        Sign In
                      </Text>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <View>
                    <Text className="mb-2 text-sm font-medium text-gray-700">
                      Verification Code
                    </Text>
                    <TextInput
                      value={secondFactorCode}
                      onChangeText={setSecondFactorCode}
                      placeholder="Enter the code sent to your email"
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-800"
                      placeholderTextColor="#9CA3AF"
                      editable={!isLoading}
                      maxLength={6}
                    />
                  </View>

                  {/* Verify Button */}
                  <Pressable
                    onPress={handleSecondFactor}
                    disabled={isLoading}
                    className={`mt-6 rounded-xl py-4 ${isLoading ? 'bg-[#4F79DB]/70' : 'bg-[#4F79DB]'}`}>
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-center text-base font-semibold text-white">
                        Verify Code
                      </Text>
                    )}
                  </Pressable>

                  {/* Back to Sign In */}
                  <Pressable
                    onPress={() => {
                      setNeedsSecondFactor(false);
                      setSecondFactorCode('');
                      setError(null);
                    }}
                    disabled={isLoading}
                    className="mt-4">
                    <Text className="text-center text-base text-[#4F79DB]">Back to Sign In</Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* Sign Up Link */}
            <View className="mt-8 flex-row items-center justify-center">
              <Text className="text-base text-gray-500">{"Don't have an account? "}</Text>
              <Link href="/sign-up" asChild>
                <Pressable disabled={isLoading}>
                  <Text className="text-base font-semibold text-[#4F79DB]">Sign Up</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

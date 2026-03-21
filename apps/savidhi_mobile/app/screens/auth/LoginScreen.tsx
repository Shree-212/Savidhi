import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { PrimaryButton } from '../../components/shared/PrimaryButton';
import { authService } from '../../services';

interface LoginScreenProps {
  navigation: any;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerateOtp = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    try {
      await authService.sendOtp(phone);
      setOtpSent(true);
    } catch (err) {
      console.error('LoginScreen sendOtp error:', err);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await authService.verifyOtp(phone, otp);
      const data = res.data?.data ?? res.data;
      if (data?.accessToken || res.data?.success) {
        navigation.replace('MainTabs');
      } else {
        Alert.alert('Error', 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      console.error('LoginScreen verifyOtp error:', err);
      Alert.alert('Error', 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.replace('MainTabs');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Skip button */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
          <Icon name="skip-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>

        {/* Kalash Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/splashbg.png')}
            style={styles.kalashImage}
            resizeMode="contain"
          />
        </View>

        {/* Login Title */}
        <Text style={styles.title}>Log In</Text>

        {/* Phone Input */}
        {!otpSent ? (
          <>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="96668 88882"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={styles.ctaButton} />
            ) : (
              <PrimaryButton
                title="Generate OTP"
                onPress={handleGenerateOtp}
                style={styles.ctaButton}
                disabled={phone.length < 10}
              />
            )}
          </>
        ) : (
          <>
            <Text style={styles.inputLabel}>OTP</Text>
            <View style={styles.otpRow}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <TextInput
                  key={i}
                  style={styles.otpBox}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={otp[i] || ''}
                  onChangeText={(val) => {
                    const newOtp = otp.split('');
                    newOtp[i] = val;
                    setOtp(newOtp.join(''));
                  }}
                />
              ))}
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={styles.ctaButton} />
            ) : (
              <PrimaryButton
                title="Submit"
                onPress={handleSubmit}
                style={styles.ctaButton}
              />
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    paddingBottom: Spacing.xxxl,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: Spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    zIndex: 10,
  },
  skipText: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
    marginRight: Spacing.xs,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: Spacing.huge,
    marginBottom: Spacing.xxl,
  },
  kalashImage: {
    width: 220,
    height: 220,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  inputLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xl,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  otpBox: {
    width: 46,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
    ...Typography.h3,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  ctaButton: {
    marginTop: Spacing.sm,
  },
});

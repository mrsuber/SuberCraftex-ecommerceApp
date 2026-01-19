import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, borderRadius, fontSize, fontWeight, spacing } from '@/config/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  secureTextEntry,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry !== undefined;

  const inputContainerStyles = [
    styles.inputContainer,
    error && styles.inputError,
    props.editable === false && styles.inputDisabled,
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={inputContainerStyles}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            (rightIcon || isPassword) ? styles.inputWithRightIcon : undefined,
            style,
          ].filter(Boolean)}
          placeholderTextColor={colors.gray[400]}
          secureTextEntry={isPassword && !isPasswordVisible}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color={colors.gray[400]} />
            ) : (
              <Eye size={20} color={colors.gray[400]} />
            )}
          </TouchableOpacity>
        ) : (
          rightIcon && <View style={styles.iconRight}>{rightIcon}</View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {helper && !error && <Text style={styles.helper}>{helper}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.gray[100],
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  iconLeft: {
    paddingLeft: spacing.md,
  },
  iconRight: {
    paddingRight: spacing.md,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helper: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
});

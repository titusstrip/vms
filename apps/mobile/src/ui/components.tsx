/** Petits composants d'interface réutilisés par tous les écrans. */
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (pressed || disabled) && styles.buttonDimmed,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === 'secondary' && { color: colors.primary },
          variant === 'danger' && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...input }: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        {...input}
        style={[styles.input, input.style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function SearchInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      autoCorrect={false}
      autoCapitalize="none"
      clearButtonMode="while-editing"
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

type BadgeTone = 'neutral' | 'success' | 'warning';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const palette = {
    neutral: { backgroundColor: colors.primarySoft, color: colors.primary },
    success: { backgroundColor: colors.successSoft, color: colors.success },
    warning: { backgroundColor: colors.warningSoft, color: colors.warning },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.badgeLabel, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** Fenêtre plein écran avec titre et bouton de fermeture, pour les fiches et formulaires. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} numberOfLines={1}>
            {title}
          </Text>
          <Button label="Fermer" variant="secondary" compact onPress={onClose} />
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: spacing.md },
  buttonPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.surface, borderColor: colors.border },
  buttonDanger: { backgroundColor: colors.surface, borderColor: colors.danger },
  buttonDimmed: { opacity: 0.55 },
  buttonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  hint: { fontSize: 13, color: colors.muted },
  badge: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeLabel: { fontSize: 13, fontWeight: '700' },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius,
    padding: spacing.md,
    fontSize: 15,
  },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyMessage: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text },
  sheetContent: { padding: spacing.lg, gap: spacing.lg },
});

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BtnForestFull,
  BtnOutline,
  BtnSubtle,
  FrostedCard,
  GreenTopCell,
  useT,
} from '../../ui';

export interface EmailConfirmationScreenProps {
  email: string;
  busy: boolean;
  error: string | null;
  message: string | null;
  onResend: () => void;
  onContinueOffline: () => void;
  onBackToSignIn?: () => void;
}

export function EmailConfirmationScreen(props: EmailConfirmationScreenProps) {
  const t = useT();
  const isFil = t.logInTitle === 'Mag-log in';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.body}>
        {/* Green Top Cell */}
        <GreenTopCell
          centered
          headerIcon={<Text style={{ fontSize: 36 }}>📬</Text>}
          title={isFil ? 'Tingnan ang Iyong Email' : 'Check your email'}
          subtitle={isFil ? 'Ipinadala ang verification link' : 'A verification link has been sent'}
        />

        {/* Email Badge Card */}
        <FrostedCard style={[styles.card, { alignItems: 'center' }]}>
          <Text style={styles.sentLabel}>
            {isFil ? 'Nagpadala kami ng email sa:' : 'We sent a confirmation link to:'}
          </Text>

          <View style={styles.emailBadge}>
            <Text style={styles.emailBadgeText}>
              {props.email}
            </Text>
          </View>

          <Text style={styles.hintText}>
            {isFil
              ? 'I-click ang link sa loob ng mensahe upang mapagana ang cloud sync. Maaari mo pa ring gamitin ang app nang offline.'
              : 'Click the verification link to activate optional cloud sync. You can continue using offline features anytime.'}
          </Text>

          {props.message ? (
            <Text style={styles.messageText} accessibilityLiveRegion="polite">
              {props.message}
            </Text>
          ) : null}

          {props.error ? (
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {props.error}
            </Text>
          ) : null}
        </FrostedCard>

        {/* Action Buttons */}
        <View style={styles.actionsColumn}>
          <BtnForestFull
            label={props.busy ? (isFil ? 'Muling ipinapadala…' : 'Resending…') : (isFil ? '🔄 Muling Ipadala ang Link' : '🔄 Resend Email')}
            accessibilityLabel={props.busy ? (isFil ? 'Muling ipinapadala…' : 'Resending…') : (isFil ? 'Muling Ipadala ang Link' : 'Resend Email')}
            onPress={() => {
              if (props.busy) return;
              props.onResend();
            }}
            disabled={props.busy}
          />

          {props.onBackToSignIn ? (
            <BtnOutline
              label={isFil ? 'Bumalik sa Log In' : 'Back to Log In'}
              accessibilityLabel={isFil ? 'Bumalik sa Log In' : 'Back to Log In'}
              onPress={props.onBackToSignIn}
              disabled={props.busy}
            />
          ) : null}

          <BtnSubtle
            label={`🔒 ${isFil ? 'Magpatuloy sa Paggamit nang Offline' : 'Continue Using Offline'}`}
            accessibilityLabel={isFil ? 'Magpatuloy sa Paggamit nang Offline' : 'Continue Using Offline'}
            textColor="#3f5246"
            onPress={props.onContinueOffline}
            disabled={props.busy}
            style={styles.continueOfflineBtn}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f2f6f3',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f2f6f3',
  },
  body: {
    paddingTop: 14,
    paddingHorizontal: 15,
    paddingBottom: 20,
    gap: 14,
  },
  card: {
    padding: 16,
  },
  sentLabel: {
    fontSize: 13,
    color: '#1c2820',
    marginBottom: 8,
    textAlign: 'center',
  },
  emailBadge: {
    alignSelf: 'stretch',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  emailBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#154d2e',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
  },
  messageText: {
    fontSize: 12,
    color: '#154d2e',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  actionsColumn: {
    gap: 8,
    marginTop: 4,
  },
  continueOfflineBtn: {
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
  },
});

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { X, Check, RotateCcw } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

interface SignatureCaptureProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SignatureCapture({
  visible,
  onClose,
  onSave,
}: SignatureCaptureProps) {
  const signatureRef = useRef<SignatureViewRef>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setIsEmpty(true);
  };

  const handleSave = () => {
    signatureRef.current?.readSignature();
  };

  const handleOK = (signature: string) => {
    // signature is base64 data URL
    onSave(signature);
    onClose();
  };

  const handleEmpty = () => {
    setIsEmpty(true);
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  const webStyle = `.m-signature-pad {
    box-shadow: none;
    border: none;
    margin: 0;
    padding: 0;
  }
  .m-signature-pad--body {
    border: none;
    margin: 0;
    padding: 0;
  }
  .m-signature-pad--footer {
    display: none;
  }
  body, html {
    background-color: #ffffff;
  }`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.title}>Customer Signature</Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.instruction}>
          Please ask the customer to sign below to confirm delivery
        </Text>

        <View style={styles.signatureContainer}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleOK}
            onEmpty={handleEmpty}
            onBegin={handleBegin}
            autoClear={false}
            webStyle={webStyle}
            backgroundColor="#ffffff"
            penColor="#000000"
            minWidth={2}
            maxWidth={4}
            trimWhitespace={true}
            imageType="image/png"
          />
          <View style={styles.signatureLine}>
            <Text style={styles.signatureLabel}>Sign here</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClear}
          >
            <RotateCcw size={20} color={colors.gray[700]} />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              isEmpty && styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={isEmpty}
          >
            <Check size={20} color={colors.white} />
            <Text style={styles.saveButtonText}>Confirm Signature</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    paddingTop: 50, // Account for status bar
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  placeholder: {
    width: 32,
  },
  instruction: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  signatureContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
    position: 'relative',
  },
  signatureLine: {
    position: 'absolute',
    bottom: 60,
    left: spacing.lg,
    right: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[300],
    borderStyle: 'dashed',
  },
  signatureLabel: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: 40, // Account for home indicator
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  clearButton: {
    flex: 1,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  clearButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary.DEFAULT,
  },
  saveButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  disabledButton: {
    backgroundColor: colors.gray[300],
  },
});

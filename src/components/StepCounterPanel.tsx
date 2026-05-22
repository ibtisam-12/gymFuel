import React from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '../utils/elements';
import useTheme from '../styles/theme';
import { useStepSensor } from '../context/StepSensorContext';

/** Dashboard-only Android step counter card (Start / Stop). */
const StepCounterPanel: React.FC = () => {
  const { colors, globalStyles, isDark } = useTheme();
  const {
    available,
    isActive,
    liveSteps,
    statusMessage,
    showPermissionModal,
    requestStart,
    confirmStart,
    cancelPermission,
    stop,
  } = useStepSensor();

  if (!available) {
    return null;
  }

  const handlePress = () => {
    if (isActive) {
      void stop().then(() => {
        Alert.alert('Step counter stopped', 'Device step counting has been turned off.');
      });
    } else {
      requestStart();
    }
  };

  const handleConfirmStart = async () => {
    const result = await confirmStart();
    if (!result.ok) {
      Alert.alert(
        'Cannot start step counter',
        result.message || 'Permission or hardware issue.'
      );
    }
  };

  return (
    <>
      <View style={[globalStyles.card, styles.sensorCard]}>
        <View style={styles.sensorHeader}>
          <Text style={styles.sensorIcon}>👟</Text>
          <View style={styles.sensorInfo}>
            <Text style={[styles.sensorTitle, { color: colors.DARK_TEXT }]}>
              Android step counter
            </Text>
            <Text style={styles.sensorSubtitle}>
              {isActive
                ? `🟢 ${statusMessage || 'Counting steps from phone sensor'}`
                : '🔴 Tap Start to use the device step sensor'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handlePress}
            style={[
              styles.sensorToggleBtn,
              { backgroundColor: isActive ? colors.SUCCESS : colors.PRIMARY },
            ]}
          >
            <Text style={styles.sensorToggleText}>{isActive ? 'Stop' : 'Start'}</Text>
          </TouchableOpacity>
        </View>
        {isActive && (
          <Text style={styles.liveHint}>
            Live: {liveSteps.toLocaleString()} steps · auto-syncs to your account
          </Text>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={showPermissionModal}
        onRequestClose={cancelPermission}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? '#1A202C' : '#FFFFFF' },
            ]}
          >
            <Text style={styles.modalEmoji}>👟📲</Text>
            <Text style={[styles.modalTitle, { color: colors.DARK_TEXT }]}>
              Allow step counting
            </Text>
            <Text style={styles.modalMessage}>
              GymFuel uses your Android phone&apos;s built-in step sensor to count
              how many steps you take today and save them to your account.
              Activity recognition permission is required.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={cancelPermission}
                style={[styles.modalBtn, { borderColor: colors.BORDER, borderWidth: 1 }]}
              >
                <Text style={{ color: colors.SUB_TEXT, fontWeight: '700' }}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmStart}
                style={[styles.modalBtn, { backgroundColor: colors.PRIMARY }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Allow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  sensorCard: {
    padding: 16,
    marginBottom: 24,
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sensorIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sensorInfo: {
    flex: 1,
  },
  sensorTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sensorSubtitle: {
    fontSize: 11,
    color: '#8A8D9F',
    marginTop: 2,
  },
  sensorToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  sensorToggleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  liveHint: {
    fontSize: 10,
    color: '#3182CE',
    backgroundColor: '#3182CE10',
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtn: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StepCounterPanel;

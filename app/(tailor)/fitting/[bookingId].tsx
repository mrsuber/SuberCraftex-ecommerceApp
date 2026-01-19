import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Info,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react-native';
import { Card, CardContent, CardHeader, Button } from '@/components/ui';
import { tailorApi, fittingsApi } from '@/api/tailor';
import { formatDate } from '@/utils/format';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00',
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

export default function ScheduleFittingScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch booking to show context
  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['tailor', 'booking', bookingId],
    queryFn: () => tailorApi.getBookingById(bookingId!),
    enabled: !!bookingId,
  });

  // Create fitting mutation
  const createFittingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTime) {
        throw new Error('Please select date and time');
      }
      return fittingsApi.create({
        bookingId: bookingId!,
        scheduledDate: selectedDate.toISOString().split('T')[0],
        scheduledTime: selectedTime,
        durationMinutes: selectedDuration,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['tailor', 'booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId, 'fittings'] });
      queryClient.invalidateQueries({ queryKey: ['tailor', 'fittings'] });

      Alert.alert('Success', 'Fitting appointment scheduled successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to schedule fitting');
    },
  });

  const handleSubmit = () => {
    if (!selectedDate) {
      Alert.alert('Required', 'Please select a date');
      return;
    }
    if (!selectedTime) {
      Alert.alert('Required', 'Please select a time');
      return;
    }

    createFittingMutation.mutate();
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty days for the first week
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Disable past dates
    if (date < today) return true;

    // Disable Sundays
    if (date.getDay() === 0) return true;

    // Disable dates more than 30 days in the future
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    if (date > maxDate) return true;

    return false;
  };

  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    if (newMonth >= new Date()) {
      setCurrentMonth(newMonth);
    }
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const calendarDays = generateCalendarDays();
  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  if (isLoadingBooking) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: booking ? `Fitting - #${booking.booking_number}` : 'Schedule Fitting',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Booking Info */}
            {booking && (
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingNumber}>#{booking.booking_number}</Text>
                <Text style={styles.customerName}>{booking.customer_name}</Text>
                <Text style={styles.serviceName}>{booking.service?.name}</Text>
              </View>
            )}

            {/* Info Alert */}
            <View style={styles.infoAlert}>
              <Info size={18} color={colors.info} />
              <Text style={styles.infoText}>
                Schedule a fitting appointment for the customer. They will receive an email
                notification with the appointment details.
              </Text>
            </View>

            {/* Date Selection */}
            <Card style={styles.section} variant="outlined">
              <CardHeader title="Select Date *" />
              <CardContent>
                {/* Month Navigation */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity onPress={goToPreviousMonth}>
                    <ChevronLeft size={24} color={colors.gray[600]} />
                  </TouchableOpacity>
                  <Text style={styles.monthYear}>{monthYear}</Text>
                  <TouchableOpacity onPress={goToNextMonth}>
                    <ChevronRight size={24} color={colors.gray[600]} />
                  </TouchableOpacity>
                </View>

                {/* Day Labels */}
                <View style={styles.dayLabels}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Text key={day} style={styles.dayLabel}>
                      {day}
                    </Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <View key={`empty-${index}`} style={styles.dayCell} />;
                    }

                    const isDisabled = isDateDisabled(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <TouchableOpacity
                        key={day.toISOString()}
                        style={[
                          styles.dayCell,
                          isDisabled && styles.dayCellDisabled,
                          isSelected && styles.dayCellSelected,
                          isToday && !isSelected && styles.dayCellToday,
                        ]}
                        onPress={() => !isDisabled && setSelectedDate(day)}
                        disabled={isDisabled}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            isDisabled && styles.dayNumberDisabled,
                            isSelected && styles.dayNumberSelected,
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </CardContent>
            </Card>

            {/* Time Selection */}
            <Card style={styles.section} variant="outlined">
              <CardHeader title="Select Time *" />
              <CardContent>
                <View style={styles.timeGrid}>
                  {TIME_SLOTS.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeSlot,
                          isSelected && styles.timeSlotSelected,
                        ]}
                        onPress={() => setSelectedTime(time)}
                      >
                        <Text
                          style={[
                            styles.timeText,
                            isSelected && styles.timeTextSelected,
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </CardContent>
            </Card>

            {/* Duration Selection */}
            <Card style={styles.section} variant="outlined">
              <CardHeader title="Duration" />
              <CardContent>
                <View style={styles.durationGrid}>
                  {DURATION_OPTIONS.map((option) => {
                    const isSelected = selectedDuration === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.durationOption,
                          isSelected && styles.durationOptionSelected,
                        ]}
                        onPress={() => setSelectedDuration(option.value)}
                      >
                        <Text
                          style={[
                            styles.durationText,
                            isSelected && styles.durationTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {isSelected && (
                          <CheckCircle2 size={16} color={colors.white} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card style={styles.section} variant="outlined">
              <CardHeader title="Notes" subtitle="Optional notes for the fitting appointment" />
              <CardContent>
                <TextInput
                  style={styles.textInput}
                  placeholder="E.g., First fitting for suit adjustment..."
                  placeholderTextColor={colors.gray[400]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </CardContent>
            </Card>

            {/* Summary */}
            {selectedDate && selectedTime && (
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Appointment Summary</Text>
                <View style={styles.summaryRow}>
                  <Calendar size={16} color={colors.primary.DEFAULT} />
                  <Text style={styles.summaryText}>
                    {formatDate(selectedDate.toISOString())}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Clock size={16} color={colors.primary.DEFAULT} />
                  <Text style={styles.summaryText}>
                    {selectedTime} ({selectedDuration} min)
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: spacing.xl * 2 }} />
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.bottomActions}>
            <Button
              title={createFittingMutation.isPending ? 'Scheduling...' : 'Schedule Fitting'}
              leftIcon={<CalendarPlus size={18} color={colors.white} />}
              onPress={handleSubmit}
              loading={createFittingMutation.isPending}
              disabled={!selectedDate || !selectedTime || createFittingMutation.isPending}
              fullWidth
              size="lg"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  bookingInfo: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  bookingNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  customerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.xs,
  },
  serviceName: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthYear: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayCellSelected: {
    backgroundColor: colors.primary.DEFAULT,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  dayNumber: {
    fontSize: fontSize.sm,
    color: colors.gray[900],
    fontWeight: fontWeight.medium,
  },
  dayNumberDisabled: {
    color: colors.gray[400],
  },
  dayNumberSelected: {
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeSlot: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  timeSlotSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    fontWeight: fontWeight.medium,
  },
  timeTextSelected: {
    color: colors.white,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  durationOptionSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  durationText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    fontWeight: fontWeight.medium,
  },
  durationTextSelected: {
    color: colors.white,
  },
  textInput: {
    minHeight: 80,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    fontSize: fontSize.base,
    color: colors.gray[900],
    backgroundColor: colors.white,
  },
  summary: {
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  summaryTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.gray[800],
  },
  bottomActions: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
});

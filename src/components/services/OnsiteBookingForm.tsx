import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Calendar, Clock, Camera, Info } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { PhotoUpload } from './PhotoUpload';
import { DesignOptionsPicker } from './DesignOptionsPicker';
import { DesignSelection } from '@/api/services';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';
import type { Service } from '@/types';

interface OnsiteBookingFormProps {
  service: Service;
  onSubmit: (data: OnsiteBookingData) => void;
  isSubmitting?: boolean;
}

export interface OnsiteBookingData {
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
  requirementPhotos: string[];
  designSelections: DesignSelection[];
}

// Generate dates for next 30 days (excluding Sundays)
const generateDates = () => {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    if (date.getDay() !== 0) { // Exclude Sundays
      dates.push(date);
    }
  }
  return dates;
};

// Generate time slots (9 AM - 5 PM)
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 17 && minute > 0) break;
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

const formatDate = (date: Date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    day: days[date.getDay()],
    date: date.getDate(),
    month: months[date.getMonth()],
    full: date.toISOString().split('T')[0],
  };
};

export function OnsiteBookingForm({
  service,
  onSubmit,
  isSubmitting = false,
}: OnsiteBookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [requirementPhotos, setRequirementPhotos] = useState<string[]>([]);
  const [designSelections, setDesignSelections] = useState<DesignSelection[]>([]);

  const dates = generateDates();
  const timeSlots = generateTimeSlots();

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime) {
      return;
    }

    onSubmit({
      scheduledDate: selectedDate,
      scheduledTime: selectedTime,
      notes,
      requirementPhotos,
      designSelections,
    });
  };

  const isFormValid = selectedDate && selectedTime;

  return (
    <View style={styles.container}>
      {/* Info Alert */}
      <View style={styles.infoAlert}>
        <Info size={18} color={colors.info} />
        <Text style={styles.infoText}>
          Fill in the details below to schedule your on-site service appointment.
        </Text>
      </View>

      {/* Design Options Picker */}
      <DesignOptionsPicker
        serviceId={service.id}
        value={designSelections}
        onChange={setDesignSelections}
      />

      {/* Date Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={20} color={colors.gray[700]} />
          <Text style={styles.sectionTitle}>Select Date</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScroll}
        >
          {dates.map((date) => {
            const formatted = formatDate(date);
            const isSelected = selectedDate === formatted.full;
            return (
              <TouchableOpacity
                key={formatted.full}
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => setSelectedDate(formatted.full)}
              >
                <Text style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                  {formatted.day}
                </Text>
                <Text style={[styles.dateNumber, isSelected && styles.dateTextSelected]}>
                  {formatted.date}
                </Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                  {formatted.month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Time Selection */}
      {selectedDate && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={colors.gray[700]} />
            <Text style={styles.sectionTitle}>Select Time</Text>
          </View>
          <View style={styles.timeGrid}>
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeSlot, isSelected && styles.timeSlotSelected]}
                  onPress={() => setSelectedTime(slot)}
                >
                  <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Selected Summary */}
      {selectedDate && selectedTime && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            Selected: {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at {selectedTime}
          </Text>
        </View>
      )}

      {/* Photo Upload */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Camera size={20} color={colors.gray[700]} />
          <Text style={styles.sectionTitle}>Upload Photos (Optional)</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Share photos of the area or item that needs service
        </Text>
        <PhotoUpload
          photos={requirementPhotos}
          onPhotosChange={setRequirementPhotos}
          maxPhotos={5}
        />
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Any specific requirements or instructions for our team..."
          placeholderTextColor={colors.gray[400]}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <Button
        title={isSubmitting ? 'Booking...' : 'Book Appointment'}
        onPress={handleSubmit}
        disabled={!isFormValid || isSubmitting}
        loading={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#EFF6FF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  dateScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateCard: {
    width: 70,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  dateCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  dateDay: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: 2,
  },
  dateNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  dateMonth: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  dateTextSelected: {
    color: colors.white,
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
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  timeSlotSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    fontFamily: 'monospace',
  },
  timeTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  summaryCard: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  summaryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[800],
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[900],
    minHeight: 100,
    backgroundColor: colors.white,
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, Plus } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/config/theme';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 5,
}: PhotoUploadProps) {
  const pickImage = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: maxPhotos - photos.length,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      onPhotosChange([...photos, ...newPhotos].slice(0, maxPhotos));
    }
  };

  const takePhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      onPhotosChange([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
  };

  const showOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Photo Grid */}
      <View style={styles.photoGrid}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePhoto(index)}
            >
              <X size={14} color={colors.white} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Photo Button */}
        {photos.length < maxPhotos && (
          <TouchableOpacity style={styles.addButton} onPress={showOptions}>
            <Plus size={24} color={colors.gray[400]} />
            <Text style={styles.addText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Photo Count */}
      <Text style={styles.countText}>
        {photos.length} / {maxPhotos} photos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
  },
  addText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  countText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
});

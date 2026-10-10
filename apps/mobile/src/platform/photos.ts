import * as ImagePicker from 'expo-image-picker';

export type PickedPhoto = { uri: string; mimeType: string };

export type PickResult =
  | { kind: 'picked'; photo: PickedPhoto }
  | { kind: 'cancelled' }
  | { kind: 'denied'; canAskAgain: boolean };

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  exif: false,
  // iOS: hand over a JPEG rather than HEIC, which the API doesn't accept.
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

/**
 * Takes or chooses one garment photo. Camera permission is requested here, at the moment of use, never up
 * front. The library uses the system photo picker, which needs no permission on current Android and iOS.
 */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { kind: 'denied', canAskAgain: permission.canAskAgain };
  }

  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { kind: 'cancelled' };
  return { kind: 'picked', photo: { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' } };
}

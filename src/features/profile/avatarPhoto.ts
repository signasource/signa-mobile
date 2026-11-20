import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export type AvatarSource = "camera" | "library";

export type PickedAvatar =
  | { status: "ok"; dataUrl: string }
  | { status: "cancelled" }
  | { status: "denied" };

/** Longest side of the photo we upload; the API stores it as a small data URL. */
export const AVATAR_SIDE = 256;
const AVATAR_QUALITY = 0.8;

/**
 * Lets the user take or choose a photo, crops it square and shrinks it to a JPEG data URL.
 * The photo library needs no permission (system picker); the camera does.
 */
export async function pickAvatar(source: AvatarSource): Promise<PickedAvatar> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: "denied" };
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: "cancelled" };

  const resized = await ImageManipulator.manipulate(asset.uri)
    .resize({ width: AVATAR_SIDE })
    .renderAsync();
  const saved = await resized.saveAsync({
    format: SaveFormat.JPEG,
    compress: AVATAR_QUALITY,
    base64: true,
  });
  if (!saved.base64) throw new Error("No pudimos procesar la imagen.");
  return { status: "ok", dataUrl: `data:image/jpeg;base64,${saved.base64}` };
}

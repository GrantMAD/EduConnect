import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faImage,
  faHeading,
  faAlignLeft,
  faTags,
  faList,
  faPen,
  faArrowLeft,
  faStore,
  faChevronLeft,
  faCamera,
  faCheckCircle,
  faPlusCircle,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../../services/authService';
import { getUserProfile } from '../../services/userService';
import { 
  uploadMarketplaceImage, 
  getMarketplaceImageUrl, 
  updateMarketplaceItem, 
  createMarketplaceItem 
} from '../../services/marketplaceService';

const { width } = Dimensions.get('window');

const CreateMarketplaceItemScreen = ({ route, navigation }) => {
  const { item: existingItem, fromDashboard, fromMarketScreen } = route.params || {};

  const [title, setTitle] = useState(existingItem?.title || '');
  const [description, setDescription] = useState(existingItem?.description || '');
  const [price, setPrice] = useState(existingItem?.price?.toString() || '');
  const [category, setCategory] = useState(existingItem?.category || 'Books');
  const [image, setImage] = useState(existingItem ? { uri: existingItem.image_url } : null);
  const [uploading, setUploading] = useState(false);

  const { showToast } = useToast();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) setImage(result.assets[0]);
  }, []);

  const uploadImage = useCallback(async (asset) => {
    try {
      const authUser = await getCurrentUser();
      if (!authUser) throw new Error("No user logged in");

      const buffer = Buffer.from(asset.base64, 'base64');

      const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${authUser.id}_${Date.now()}.${fileExt}`;
      const filePath = `${authUser.id}/${fileName}`;
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      await uploadMarketplaceImage(filePath, buffer);

      return getMarketplaceImageUrl(filePath);
    } catch (error) {
      console.error("Upload error:", error);
      showToast('Failed to upload image.');
      return null;
    }
  }, [showToast]);

  const handleSaveItem = useCallback(async () => {
    if (!title || !price || !category) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setUploading(true);

    try {
      const authUser = await getCurrentUser();
      if (!authUser) throw new Error('User not found');

      let imageUrl = existingItem?.image_url;
      if (image && image.uri !== existingItem?.image_url) {
        imageUrl = await uploadImage(image);
        if (!imageUrl) throw new Error('Image upload failed.');
      }

      const itemData = {
        title,
        description,
        price: parseFloat(price),
        category,
        image_url: imageUrl,
        seller_id: authUser.id,
      };

      if (existingItem) {
        await updateMarketplaceItem(existingItem.id, itemData);
        showToast('Item updated successfully!', 'success');
      } else {
        const userProfile = await getUserProfile(authUser.id);
        if (!userProfile?.school_id) throw new Error('User is not associated with a school.');

        await createMarketplaceItem({ ...itemData, school_id: userProfile.school_id });
        showToast('Item created successfully!', 'success');
      }

      navigation.goBack();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  }, [title, price, category, image, existingItem, uploadImage, navigation, showToast]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#9333ea', '#4f46e5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTextContainer}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
              activeOpacity={0.7}
            >
              <FontAwesomeIcon icon={faChevronLeft} size={14} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700', fontSize: 14 }}>Back to Marketplace</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.heroTitle}>{existingItem ? 'Edit Listing' : 'List Item'}</Text>
            </View>
            <Text style={styles.heroDescription}>
              Sell items within your trusted school community.
            </Text>
          </View>
          <View style={styles.iconBoxHero}>
            <FontAwesomeIcon icon={faStore} size={24} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <Text style={styles.cardSectionLabel}>ITEM VISUALS</Text>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.imagePicker}>
            {image ? (
              <>
                <Image source={{ uri: image.uri }} style={styles.image} />
                <View style={styles.imageOverlay}>
                  <FontAwesomeIcon icon={faCamera} size={16} color="#fff" />
                  <Text style={styles.imageOverlayText}>CHANGE</Text>
                </View>
              </>
            ) : (
              <View style={[styles.placeholderBox, { backgroundColor: theme.colors.background }]}>
                <FontAwesomeIcon icon={faImage} size={40} color={theme.colors.placeholder} style={{ opacity: 0.2 }} />
                <Text style={[styles.placeholderText, { color: theme.colors.placeholder }]}>Tap to upload photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
          <Text style={styles.cardSectionLabel}>LISTING DETAILS</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>TITLE</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="What are you selling?"
                placeholderTextColor={theme.colors.placeholder}
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DESCRIPTION</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1, height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, height: 80 }]}
                placeholder="Provide details about the item..."
                placeholderTextColor={theme.colors.placeholder}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.inputLabel}>PRICE (R)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.placeholder}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1.2 }]}>
              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <Picker selectedValue={category} onValueChange={(v) => setCategory(v)} style={{ color: theme.colors.text }}>
                  <Picker.Item label="Books" value="Books" />
                  <Picker.Item label="Electronics" value="Electronics" />
                  <Picker.Item label="Stationery" value="Stationery" />
                  <Picker.Item label="Furniture" value="Furniture" />
                  <Picker.Item label="Clothing" value="Clothing" />
                  <Picker.Item label="Other" value="Other" />
                </Picker>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtnContainer, { marginTop: 30 }]}
          onPress={handleSaveItem}
          disabled={uploading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#9333ea', '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createBtn}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesomeIcon icon={existingItem ? faCheckCircle : faPlusCircle} size={18} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.createBtnText}>{existingItem ? 'Update Listing' : 'Publish Listing'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default React.memo(CreateMarketplaceItemScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: {
    padding: 24,
    paddingTop: 16,
    elevation: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -1,
  },
  heroDescription: {
    color: '#f5f3ff',
    fontSize: 14,
    fontWeight: '500',
  },
  iconBoxHero: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: { padding: 24, borderRadius: 32 },
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  imagePicker: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  placeholderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 12, fontWeight: '700', marginTop: 12, textTransform: 'uppercase', letterSpacing: 1 },
  imageOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  imageOverlayText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  imageHint: { fontSize: 10, textAlign: 'center', marginTop: 12, fontWeight: '600' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  inputWrapper: { borderRadius: 16, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  input: { fontSize: 15, fontWeight: '600' },
  rowInputs: { flexDirection: 'row' },
  pickerWrapper: { borderRadius: 16, overflow: 'hidden', height: 56, justifyContent: 'center' },
  createBtnContainer: { marginBottom: 20 },
  createBtn: { height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  header: { fontSize: 24, fontWeight: '700', marginBottom: 4, color: '#333' },
  subHeader: { fontSize: 14, color: '#777', marginBottom: 16 },
  label: { fontWeight: '600', color: '#333', marginBottom: 6 },
  inputDescription: { fontSize: 12, color: '#666', marginBottom: 8 },
  overlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 6,
  },
  overlayText: { color: '#fff', marginLeft: 4, fontSize: 12 },
  imagePlaceholder: { color: '#555' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
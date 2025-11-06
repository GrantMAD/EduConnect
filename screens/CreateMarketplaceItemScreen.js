import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

export default function CreateMarketplaceItemScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Books');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) setImage(result.assets[0]);
  };

  const uploadImage = async (asset) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("No user logged in");

      const buffer = Buffer.from(asset.base64, 'base64');

      const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('marketplace')
        .upload(filePath, buffer, { cacheControl: '3600', upsert: true, contentType });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('marketplace').getPublicUrl(filePath);
      return publicData?.publicUrl || null;
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert('Error', 'Failed to upload image.');
      return null;
    }
  };

  const handleCreateItem = async () => {
    if (!title || !price || !category) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data: userProfile } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (!userProfile?.school_id) throw new Error('User is not associated with a school.');

      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
        if (!imageUrl) throw new Error('Image upload failed.');
      }

      const { error: insertError } = await supabase.from('marketplace_items').insert([
        {
          title,
          description,
          price: parseFloat(price),
          category,
          image_url: imageUrl,
          seller_id: user.id,
          school_id: userProfile.school_id,
        },
      ]);

      if (insertError) throw insertError;

      Alert.alert('Success', 'Item created successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Create Marketplace Item</Text>
      <Text style={styles.subHeader}>List an item for sale within your school community.</Text>

      {/* Image Picker */}
      <View style={styles.card}>
        <Text style={styles.label}><FontAwesomeIcon icon={faImage} color="#007AFF" /> Item Image</Text>
        <Text style={styles.inputDescription}>Upload a clear image of your item. This will be the main picture in the marketplace.</Text>
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {image ? (
            <>
              <Image source={{ uri: image.uri }} style={styles.image} />
              <View style={styles.overlay}>
                <FontAwesomeIcon icon={faPen} size={16} color="#fff" />
                <Text style={styles.overlayText}>Edit</Text>
              </View>
            </>
          ) : (
            <Text style={styles.imagePlaceholder}>Select an Image</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Info Inputs */}
      <View style={styles.card}>
        <Text style={styles.label}><FontAwesomeIcon icon={faHeading} color="#007AFF" /> Title</Text>
        <Text style={styles.inputDescription}>Give your item a short, descriptive title that will attract buyers.</Text>
        <TextInput style={styles.input} placeholder="e.g., Textbook Set" value={title} onChangeText={setTitle} />

        <Text style={styles.label}><FontAwesomeIcon icon={faAlignLeft} color="#007AFF" /> Description</Text>
        <Text style={styles.inputDescription}>Provide a detailed description of your item, including its condition and any relevant features.</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="e.g., Used but in good condition"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}><FontAwesomeIcon icon={faTags} color="#007AFF" /> Price (ZAR)</Text>
        <Text style={styles.inputDescription}>Set a fair price for your item in South African Rands.</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 150.00"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <Text style={styles.label}><FontAwesomeIcon icon={faList} color="#007AFF" /> Category</Text>
        <Text style={styles.inputDescription}>Select the most appropriate category for your item to help buyers find it easily.</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={category} onValueChange={(v) => setCategory(v)}>
            <Picker.Item label="Books" value="Books" />
            <Picker.Item label="Electronics" value="Electronics" />
            <Picker.Item label="Stationery" value="Stationery" />
            <Picker.Item label="Furniture" value="Furniture" />
            <Picker.Item label="Clothing" value="Clothing" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.createButton, uploading && { opacity: 0.7 }]}
        onPress={handleCreateItem}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Create Item</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f7f7f7', padding: 16, paddingBottom: 80 },
  header: { fontSize: 24, fontWeight: '700', marginBottom: 4, color: '#333' },
  subHeader: { fontSize: 14, color: '#777', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: { fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  inputDescription: { fontSize: 12, color: '#666', marginBottom: 8 },
  imagePicker: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
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
});

import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import CardSkeleton from './CardSkeleton';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';

const SkeletonPiece = ({ style }) => {
    const progress = useSharedValue(0);
  
    React.useEffect(() => {
      progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    }, []);
  
    const animatedStyle = useAnimatedStyle(() => {
      const opacity = interpolate(progress.value, [0, 1], [0.5, 1]);
      return {
        opacity,
      };
    });
  
    return <Animated.View style={[styles.skeleton, animatedStyle, style]} />;
  };

const CardListSkeleton = () => {
  return (
    <View style={styles.container}>
        <SkeletonPiece style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 10 }} />
        <View style={styles.hr} />
        <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={(item) => item.toString()}
            renderItem={() => <CardSkeleton />}
        />
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    hr: {
        borderBottomColor: '#ccc',
        borderBottomWidth: 1,
        marginVertical: 10,
    },
    skeleton: {
        backgroundColor: '#E0E0E0',
    },
});

export default CardListSkeleton;

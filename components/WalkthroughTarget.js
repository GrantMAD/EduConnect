import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';
import { useWalkthrough } from '../context/WalkthroughContext';

export default function WalkthroughTarget({ id, children, style }) {
    const { registerTarget, unregisterTarget, registerTargetRef } = useWalkthrough();
    const viewRef = useRef(null);

    const onLayout = () => {
        if (viewRef.current) {
            registerTargetRef(id, viewRef.current);
            viewRef.current.measure((x, y, width, height, pageX, pageY) => {
                registerTarget(id, { x: pageX, y: pageY, width, height });
            });
        }
    };

    useEffect(() => {
        // Initial measure
        // Use a timeout to ensure everything is settled?
        const timer = setTimeout(onLayout, 100);

        return () => {
            clearTimeout(timer);
            unregisterTarget(id);
        };
    }, []); // Run once on mount

    return (
        <View
            ref={viewRef}
            style={style}
            onLayout={onLayout}
            collapsable={false} // Important for Android measurement
        >
            {children}
        </View>
    );
}

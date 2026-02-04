import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
    withSequence,
    runOnJS,
    Easing,
    withRepeat,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = ['#FFC700', '#FF0000', '#2E3192', '#41BBC7', '#73F218', '#eb2f96', '#722ed1'];

type ParticleProps = {
    x: number;
    y: number;
    color: string;
    delay: number;
    angle: number;
    velocity: number;
};

const Particle = ({ x, y, color, delay, angle, velocity }: ParticleProps) => {
    const translateX = useSharedValue(x);
    const translateY = useSharedValue(y);
    const opacity = useSharedValue(1);
    const rotation = useSharedValue(0);

    useEffect(() => {
        // Basic physics simulation
        const duration = 2000;

        // Horizontal motion based on angle (cosine)
        const endX = x + Math.cos(angle) * (velocity * 200);

        // Vertical motion (projectile with gravity)
        // Initial upward burst (sin) + gravity drop
        const endY = SCREEN_HEIGHT + 100; // Fall off screen

        translateX.value = withDelay(delay, withTiming(endX, { duration, easing: Easing.linear }));

        // Initial upward impulse followed by gravity fall
        // Simplified: Just falling with some arc
        // For a better "burst", we can verify if velocity is high towards top

        // Simple implementation: Move to target X, and Drop to bottom Y
        // But to simulate arc: 
        // We can just animate Y to top then bottom? No, simpler is direct translation with easing

        translateY.value = withDelay(
            delay,
            withTiming(endY, { duration, easing: Easing.bezier(0.5, 0, 1, 1) }) // Accelerate down
        );

        opacity.value = withDelay(delay + duration - 500, withTiming(0, { duration: 500 }));

        rotation.value = withDelay(
            delay,
            withRepeat(withTiming(360, { duration: 500 + Math.random() * 500 }), -1)
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotation.value}deg` },
                { rotateX: `${rotation.value}deg` },
            ],
            opacity: opacity.value,
        };
    });

    return (
        <Animated.View
            style={[
                styles.particle,
                { backgroundColor: color, left: 0, top: 0 }, // Position handled by translate
                animatedStyle,
            ]}
        />
    );
};

interface ConfettiSystemProps {
    active: boolean;
    count?: number;
    duration?: number;
    continuous?: boolean;
    colors?: string[];
}

export const ConfettiSystem: React.FC<ConfettiSystemProps> = ({
    active,
    count = 50,
    duration = 3000,
    continuous = false,
    colors = COLORS
}) => {
    const [particles, setParticles] = useState<ParticleProps[]>([]);
    const [key, setKey] = useState(0); // To force re-render of separate bursts

    useEffect(() => {
        if (active) {

            const spawnParticles = () => {
                const newParticles: ParticleProps[] = [];
                const startX = SCREEN_WIDTH / 2;
                const startY = SCREEN_HEIGHT * 0.3;

                for (let i = 0; i < count; i++) {
                    newParticles.push({
                        x: startX,
                        y: startY,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        delay: Math.random() * 500,
                        angle: (Math.random() * Math.PI * 2),
                        velocity: 1 + Math.random() * 3,
                    });
                }
                setParticles(newParticles);
                setKey(k => k + 1); // Force new particles to mount with fresh animations
            };

            spawnParticles();

            if (continuous) {
                const interval = setInterval(spawnParticles, 3000); // Burst every 3s
                return () => clearInterval(interval);
            } else {
                const timer = setTimeout(() => {
                    setParticles([]);
                }, duration + 1000);
                return () => clearTimeout(timer);
            }
        } else {
            setParticles([]);
        }
    }, [active, count, duration, continuous, colors]); // Added dependencies

    if (!active && particles.length === 0) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.map((p, i) => (
                <Particle key={`${key}-${i}`} {...p} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        elevation: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    particle: {
        width: 8,
        height: 8,
        position: 'absolute',
        borderRadius: 2,
    },
});

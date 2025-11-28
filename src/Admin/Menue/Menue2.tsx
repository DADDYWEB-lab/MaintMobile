//@ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Pressable,
  Modal,
  Animated,
  Easing,
} from 'react-native';

import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const PANEL_WIDTH = width * 0.85;

interface MenuItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string[];
  badge?: string;
  onPress: () => void;
}

interface FloatingSidePanelProps {
  visible: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}

const FloatingSidePanel: React.FC<FloatingSidePanelProps> = ({
  visible,
  onClose,
  menuItems,
}) => {
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const itemAnimations = useRef(
    menuItems.map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const iconRotations = useRef(
    menuItems.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Staggered scale + opacity animation
      Animated.stagger(
        60,
        itemAnimations.map((anim, index) =>
          Animated.parallel([
            Animated.spring(anim.scale, {
              toValue: 1,
              tension: 80,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            // Subtle icon rotation
            Animated.spring(iconRotations[index], {
              toValue: 1,
              tension: 60,
              friction: 8,
              useNativeDriver: true,
            }),
          ])
        )
      ).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: -PANEL_WIDTH,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      itemAnimations.forEach((anim) => {
        anim.scale.setValue(0);
        anim.opacity.setValue(0);
      });
      iconRotations.forEach((rot) => rot.setValue(0));
    }
  }, [visible]);

  if (!visible && translateX._value === -PANEL_WIDTH) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <BlurView intensity={100} tint="light" style={styles.blurContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(248, 250, 252, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradient}
            >
              {/* Header Premium */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerIconContainer}
                  >
                    <Text style={styles.headerIcon}>✨</Text>
                  </LinearGradient>
                  <View>
                    <Text style={styles.headerTitle}>Navigation</Text>
                    <Text style={styles.headerSubtitle}>Actions rapides</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <BlurView intensity={30} tint="light" style={styles.closeBlur}>
                    <Text style={styles.closeIcon}>✕</Text>
                  </BlurView>
                </TouchableOpacity>
              </View>

              {/* Menu Items - Design Cards */}
              <View style={styles.menuContainer}>
                {menuItems.map((item, index) => {
                  const itemScale = itemAnimations[index].scale;
                  const itemOpacity = itemAnimations[index].opacity;
                  const iconRotate = iconRotations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-15deg', '0deg'],
                  });

                  return (
                    <Animated.View
                      key={item.id}
                      style={[
                        styles.menuItemWrapper,
                        {
                          opacity: itemOpacity,
                          transform: [{ scale: itemScale }],
                        },
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          item.onPress();
                          onClose();
                        }}
                      >
                        <BlurView intensity={30} tint="light" style={styles.menuItemBlur}>
                          <LinearGradient
                            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                            style={styles.menuItem}
                          >
                            {/* Icon avec effet 3D */}
                            <Animated.View
                              style={[
                                styles.iconWrapper,
                                { transform: [{ rotate: iconRotate }] },
                              ]}
                            >
                              <LinearGradient
                                colors={item.color}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.iconGradient}
                              >
                                <View style={styles.iconInnerShadow} />
                                <Text style={styles.icon}>{item.icon}</Text>
                                
                                {/* Badge notification */}
                                {item.badge && (
                                  <View style={styles.badgeContainer}>
                                    <LinearGradient
                                      colors={['#EF4444', '#DC2626']}
                                      style={styles.badge}
                                    >
                                      <Text style={styles.badgeText}>{item.badge}</Text>
                                    </LinearGradient>
                                  </View>
                                )}

                                {/* Shine effect */}
                                <LinearGradient
                                  colors={['rgba(255, 255, 255, 0.3)', 'transparent', 'transparent']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.shine}
                                />
                              </LinearGradient>
                            </Animated.View>

                            {/* Text content */}
                            <View style={styles.menuTextContainer}>
                              <Text style={styles.menuTitle}>{item.title}</Text>
                              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                            </View>

                            {/* Arrow indicator */}
                            <View style={styles.arrowContainer}>
                              <LinearGradient
                                colors={['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.05)']}
                                style={styles.arrowGradient}
                              >
                                <Text style={styles.arrow}>›</Text>
                              </LinearGradient>
                            </View>
                          </LinearGradient>
                        </BlurView>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>

            </LinearGradient>
          </BlurView>

          {/* Edge glow premium */}
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.4)', 'rgba(37, 99, 235, 0.2)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={styles.edgeGlow}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  blurContainer: {
    flex: 1,
    borderTopRightRadius: 48,
    borderBottomRightRadius: 48,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  closeBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  closeIcon: {
    fontSize: 20,
    color: '#475569',
    fontWeight: '700',
  },
  menuContainer: {
    flex: 1,
    gap: 10,
  },
  menuItemWrapper: {
    marginBottom: 4,
  },
  menuItemBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  iconWrapper: {
    position: 'relative',
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  iconInnerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
  },
  icon: {
    fontSize: 32,
    zIndex: 2,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  arrowContainer: {
    marginLeft: 8,
  },
  arrowGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 28,
    color: '#3B82F6',
    fontWeight: '300',
  },
  bottomSection: {
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  bottomBlur: {
    overflow: 'hidden',
  },
  bottomContent: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
  },
  edgeGlow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
});

export default function App() {
  const [panelVisible, setPanelVisible] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: '1',
      icon: '📋',
      title: 'Tâches',
      subtitle: 'Gérer les tâches',
      color: ['#3B82F6', '#1D4ED8'],
      badge: '5',
      onPress: () => console.log('Tâches'),
    },
    {
      id: '2',
      icon: '📢',
      title: 'Réclamations',
      subtitle: 'Voir réclamations',
      color: ['#EF4444', '#B91C1C'],
      badge: '12',
      onPress: () => console.log('Réclamations'),
    },
    {
      id: '3',
      icon: '👤',
      title: 'Personnel',
      subtitle: 'Gérer équipe',
      color: ['#8B5CF6', '#6D28D9'],
      onPress: () => console.log('Personnel'),
    },
    {
      id: '4',
      icon: '📊',
      title: 'Statistiques',
      subtitle: 'Voir détails',
      color: ['#10B981', '#047857'],
      onPress: () => console.log('Statistiques'),
    },
    {
      id: '5',
      icon: '🚚',
      title: 'Fournisseurs',
      subtitle: 'Gérer fournisseurs',
      color: ['#F59E0B', '#D97706'],
      onPress: () => console.log('Fournisseurs'),
    },
    {
      id: '6',
      icon: '🏠',
      title: 'Espaces',
      subtitle: 'Gérer espaces',
      color: ['#EC4899', '#BE185D'],
      onPress: () => console.log('Espaces'),
    },
  ];

  return (
    <View style={appStyles.app}>
      <LinearGradient
        colors={['#EEF2FF', '#E0E7FF', '#DBEAFE']}
        style={appStyles.background}
      >
        <TouchableOpacity
          style={appStyles.triggerButton}
          onPress={() => setPanelVisible(true)}
          activeOpacity={0.9}
        >
          <BlurView intensity={60} tint="light" style={appStyles.triggerBlur}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.9)', 'rgba(37, 99, 235, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={appStyles.triggerGradient}
            >
              <Text style={appStyles.triggerIcon}>☰</Text>
              <Text style={appStyles.triggerText}>Menu</Text>
            </LinearGradient>
          </BlurView>
        </TouchableOpacity>

        <FloatingSidePanel
          visible={panelVisible}
          onClose={() => setPanelVisible(false)}
          menuItems={menuItems}
        />
      </LinearGradient>
    </View>
  );
}

const appStyles = StyleSheet.create({
  app: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  triggerBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  triggerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 18,
    gap: 12,
  },
  triggerIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  triggerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
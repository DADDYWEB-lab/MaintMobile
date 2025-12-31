import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar, 
  Platform 
} from 'react-native';

interface HeaderButton {
  label: string;
  onPress: () => void;
  backgroundColor?: string;
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  onBackPress?: () => void; // Si présent, affiche le bouton retour
  rightButtons?: HeaderButton[]; // Permet de passer 0, 1 ou plusieurs boutons
}

const ScreenHeader = ({
  title,
  subtitle,
  backgroundColor = '#3B82F6', // Bleu par défaut
  onBackPress,
  rightButtons = []
}: ScreenHeaderProps) => {
  return (
    <View style={[styles.header, { backgroundColor }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.leftContent}>
        {onBackPress && (
          <TouchableOpacity onPress={onBackPress} style={styles.backContainer}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.rightContent}>
        {rightButtons.map((btn, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.addButton, 
              btn.backgroundColor ? { backgroundColor: btn.backgroundColor } : {}
            ]}
            onPress={btn.onPress}
          >
            <Text style={styles.addButtonText}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 45,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    gap: 10,
  },
  backContainer: {
    marginBottom: 5,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ScreenHeader;
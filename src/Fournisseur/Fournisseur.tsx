import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Icônes pour fournisseurs
const MenuIcon = () => <Text style={styles.icon}>☰</Text>;
const BellIcon = () => <Text style={styles.icon}>🔔</Text>;
const PhoneIcon = () => <Text style={styles.icon}>📞</Text>;
const EmailIcon = () => <Text style={styles.icon}>✉️</Text>;
const LocationIcon = () => <Text style={styles.icon}>📍</Text>;
const BoxIcon = () => <Text style={styles.iconSmall}>📦</Text>;
const TruckIcon = () => <Text style={styles.iconSmall}>🚚</Text>;
const StarIcon = () => <Text style={styles.iconSmall}>⭐</Text>;
const CheckIcon = () => <Text style={styles.iconSmall}>✓</Text>;

export default function ProviderBooking() {
  const [selectedDate, setSelectedDate] = useState(24);
  const [selectedTime, setSelectedTime] = useState('10:00');

  const dates = [
    { day: 22, label: 'Lundi' },
    { day: 23, label: 'Mardi' },
    { day: 24, label: 'Mercredi' },
    { day: 25, label: 'Jeudi' },
  ];

  const timeSlots = ['8:00', '9:00', '10:00', '11:00', '12:00', '14:00', '15:00'];

  return (
    <LinearGradient
      colors={['#FEF3C7', '#FDE68A', '#FAFAF9']}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton}>
              <MenuIcon />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Réserver un Fournisseur</Text>
            <TouchableOpacity style={styles.headerButton}>
              <BellIcon />
            </TouchableOpacity>
          </View>

          {/* Provider Card */}
          <LinearGradient
            colors={['#78350F', '#92400E', '#A16207']}
            style={styles.providerCard}
          >
            {/* Provider Image */}
            <View style={styles.providerImageContainer}>
              <LinearGradient
                colors={['#D97706', '#F59E0B', '#FBBF24']}
                style={styles.providerImage}
              >
                <Text style={styles.providerEmoji}>🏪</Text>
              </LinearGradient>
              <View style={styles.verifiedBadge}>
                <CheckIcon />
              </View>
            </View>

            {/* Rating */}
            <View style={styles.ratingContainer}>
              <StarIcon />
              <Text style={styles.ratingText}>4.8</Text>
              <Text style={styles.ratingSubtext}>(156 avis)</Text>
            </View>

            {/* Provider Info */}
            <Text style={styles.providerName}>Matériaux ProBuild</Text>
            <Text style={styles.providerCategory}>Fournisseur de Matériaux de Construction</Text>
            <View style={styles.locationRow}>
              <LocationIcon />
              <Text style={styles.locationText}>Zone Industrielle, Tunis</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.primaryButton}>
                <BoxIcon />
                <Text style={styles.primaryButtonText}>Catalogue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roundButton}>
                <PhoneIcon />
              </TouchableOpacity>
              <TouchableOpacity style={styles.roundButton}>
                <EmailIcon />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <TruckIcon />
                </View>
                <View>
                  <Text style={styles.statLabel}>Livraisons</Text>
                  <Text style={styles.statValue}>500+</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <BoxIcon />
                </View>
                <View>
                  <Text style={styles.statLabel}>Produits</Text>
                  <Text style={styles.statValue}>2.5k+</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <StarIcon />
                </View>
                <View>
                  <Text style={styles.statLabel}>Note</Text>
                  <Text style={styles.statValue}>4.8/5</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Services Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services Disponibles</Text>
            <View style={styles.servicesContainer}>
              <View style={styles.serviceCard}>
                <Text style={styles.serviceIcon}>🏗️</Text>
                <Text style={styles.serviceText}>Matériaux</Text>
              </View>
              <View style={styles.serviceCard}>
                <Text style={styles.serviceIcon}>🚚</Text>
                <Text style={styles.serviceText}>Livraison</Text>
              </View>
              <View style={styles.serviceCard}>
                <Text style={styles.serviceIcon}>💰</Text>
                <Text style={styles.serviceText}>Crédit</Text>
              </View>
              <View style={styles.serviceCard}>
                <Text style={styles.serviceIcon}>📋</Text>
                <Text style={styles.serviceText}>Devis</Text>
              </View>
            </View>
          </View>

          {/* Select Date */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Choisir une Date</Text>
              <View style={styles.monthSelector}>
                <Text style={styles.chevron}>‹</Text>
                <Text style={styles.monthText}>Janvier 2026</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </View>

            <View style={styles.datesContainer}>
              {dates.map((date) => (
                <TouchableOpacity
                  key={date.day}
                  onPress={() => setSelectedDate(date.day)}
                  style={[
                    styles.dateButton,
                    selectedDate === date.day && styles.dateButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateDay,
                      selectedDate === date.day && styles.dateDaySelected,
                    ]}
                  >
                    {date.day}
                  </Text>
                  <Text
                    style={[
                      styles.dateLabel,
                      selectedDate === date.day && styles.dateLabelSelected,
                    ]}
                  >
                    {date.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Select Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horaire de Visite</Text>
            <View style={styles.timeContainer}>
              <View style={styles.timeMarkers}>
                <Text style={styles.timeMarker}>8:00</Text>
                <Text style={styles.timeMarker}>10:00</Text>
                <Text style={styles.timeMarker}>12:00</Text>
                <Text style={styles.timeMarker}>15:00</Text>
              </View>

              <View style={styles.timeSlotsContainer}>
                {timeSlots.map((time, idx) => {
                  const heights = [35, 42, 48, 40, 35, 45, 38];
                  const isSelected = selectedTime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      onPress={() => setSelectedTime(time)}
                      style={[
                        styles.timeSlot,
                        {
                          height: heights[idx],
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={
                          isSelected
                            ? ['#F59E0B', '#D97706']
                            : ['#E7E5E4', '#D6D3D1']
                        }
                        style={styles.timeSlotGradient}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <View style={styles.selectedTimeDisplay}>
                <Text style={styles.selectedTimeLabel}>Heure sélectionnée:</Text>
                <Text style={styles.selectedTimeValue}>{selectedTime}</Text>
              </View>
            </View>
          </View>

          {/* Book Button */}
          <TouchableOpacity>
            <LinearGradient
              colors={['#92400E', '#78350F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bookButton}
            >
              <Text style={styles.bookButtonText}>Confirmer le Rendez-vous</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Annulation gratuite jusqu'à 48h avant
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(120, 53, 15, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#78350F',
  },
  icon: {
    fontSize: 20,
    color: '#78350F',
  },
  iconSmall: {
    fontSize: 16,
  },
  providerCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  providerImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  providerImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  providerEmoji: {
    fontSize: 56,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#78350F',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FBBF24',
  },
  ratingSubtext: {
    fontSize: 12,
    color: '#FDE68A',
  },
  providerName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  providerCategory: {
    fontSize: 13,
    color: '#FDE68A',
    textAlign: 'center',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 13,
    color: '#FCD34D',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF24',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350F',
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 18,
    padding: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#FDE68A',
  },
  statValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 16,
  },
  servicesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78350F',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chevron: {
    fontSize: 18,
    color: '#78350F',
    fontWeight: 'bold',
  },
  monthText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78350F',
  },
  datesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dateButtonSelected: {
    backgroundColor: '#92400E',
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#78350F',
  },
  dateDaySelected: {
    color: '#FBBF24',
  },
  dateLabel: {
    fontSize: 11,
    color: '#A16207',
    marginTop: 4,
  },
  dateLabelSelected: {
    color: '#FDE68A',
  },
  timeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  timeMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeMarker: {
    fontSize: 11,
    color: '#78350F',
    fontWeight: '500',
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 50,
    marginBottom: 16,
  },
  timeSlot: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  timeSlotGradient: {
    flex: 1,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  selectedTimeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    borderRadius: 12,
  },
  selectedTimeLabel: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  selectedTimeValue: {
    fontSize: 16,
    color: '#78350F',
    fontWeight: 'bold',
  },
  bookButton: {
    paddingVertical: 18,
    borderRadius: 28,
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#78350F',
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
});
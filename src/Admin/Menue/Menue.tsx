//@ts-nocheck 
import React, { useState } from 'react';
import {
  View,    
  Text,   
  StyleSheet,          
  TouchableOpacity,      
  Dimensions,      
  StatusBar,      
  ScrollView,     
} from 'react-native';      
import { BlurView } from 'expo-blur';         
import { LinearGradient } from 'expo-linear-gradient';                   

const { width, height } = Dimensions.get('window');

interface ProjectCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string[];
}

export default function NeumorphicGlassDashboard() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const projects: ProjectCard[] = [
    {
      id: '1',
      icon: '📦',
      title: 'Archive',
      subtitle: 'collection',
      color: ['#3B82F6', '#2563EB'],
    }
      
      , 
    {
      id: '2' ,
      icon: '💡',
      title: 'Illustration' ,
      subtitle: 'collection' ,
      color: ['#F59E0B', '#EF4444']   ,
    },
    {
      id: '3',
      icon: '🎨',
      title: 'Artwork',
      subtitle: 'collection',
      color: ['#EC4899', '#8B5CF6'],
    },
    {
      id: '4',
      icon: '🔗',
      title: 'Site',
      subtitle: 'collection',
      color: ['#A855F7', '#7C3AED']   ,
    }
    ,
    {

      id: '5',
      icon: '🗂️',
      title: 'Filetype',
      subtitle: 'collection',
      color: ['#14B8A6', '#0D9488']

    }
    ,
    {

      id: '6',
      icon: '📱',
      title: 'App',
      subtitle: 'collection', 
      color: ['#F472B6', '#DB2777'],
    },
  ];

  const dates = ['15', '14', '13', '12', '11'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={['#E5E7EB', '#D1D5DB', '#C1C7D0']}
        style={styles.background}
      >
        {/* Main card avec effet neumorphique */}
        <View style={styles.mainCardWrapper}>
          <View style={styles.neumorphicCard}>
            <BlurView intensity={60} tint="light" style={styles.cardBlur}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.7)', 'rgba(248, 250, 252, 0.5)']}
                style={styles.cardGradient}
              >
                {/* Top bar */}
                <View style={styles.topBar}>
                  <View style={styles.topLeft}>
                    <View style={styles.statusDot} />
                  </View>
                  
                  <View style={styles.topCenter}>
                    <View style={styles.profileButton}>
                      <BlurView intensity={40} tint="light" style={styles.profileBlur}>
                        <Text style={styles.profileIcon}>👤</Text>
                      </BlurView>
                    </View>
                  </View>
                  
                  <TouchableOpacity style={styles.menuButton}>
                    <View style={styles.menuLine} />
                    <View style={styles.menuLine} />
                    <View style={styles.menuLine} />
                  </TouchableOpacity>
                </View>

                {/* Recents section */}
                <View style={styles.recentsSection}>
                  <View style={styles.recentsHeader}>
                    <View style={styles.clockIcon}>
                      <Text style={styles.clockEmoji}>🕐</Text>
                    </View>
                    <Text style={styles.recentsText}>Recents</Text>
                  </View>
                  <TouchableOpacity style={styles.gridIcon}>
                    <View style={styles.gridDot} />
                    <View style={styles.gridDot} />
                    <View style={styles.gridDot} />
                    <View style={styles.gridDot} />
                  </TouchableOpacity>
                </View>

                {/* Projects grid */}
                <View style={styles.projectsGrid}>
                  {projects.map((project) => (
                    <TouchableOpacity
                      key={project.id}
                      style={styles.projectWrapper}
                      onPress={() => setSelectedProject(project.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.projectCard}>
                        <LinearGradient
                          colors={project.color}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.projectIconContainer}
                        >
                          <BlurView intensity={20} tint="light" style={styles.projectIconBlur}>
                            <Text style={styles.projectIcon}>{project.icon}</Text>
                          </BlurView>
                        </LinearGradient>
                      </View>
                      <Text style={styles.projectTitle}>{project.title}</Text>
                      <Text style={styles.projectSubtitle}>{project.subtitle}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Pagination dots */}
                <View style={styles.pagination}>
                  <View style={[styles.paginationDot, styles.paginationDotInactive]} />
                  <View style={[styles.paginationDot, styles.paginationDotActive]} />
                  <View style={[styles.paginationDot, styles.paginationDotInactive]} />
                </View>

                {/* Bottom placeholder icons */}
                <View style={styles.bottomPlaceholder}>
                  <View style={styles.placeholderIcon} />
                  <View style={styles.placeholderIcon} />
                  <View style={styles.placeholderIconLarge} />
                </View>
              </LinearGradient>
            </BlurView>
          </View>
        </View>

        {/* Bottom dark card */}
        <View style={styles.bottomCardWrapper}>
          <LinearGradient
            colors={['#1E293B', '#0F172A', '#020617']}
            style={styles.darkCard}
          >
            {/* Decorative glow effects */}
            <View style={styles.glowPurple} />
            <View style={styles.glowBlue} />

            {/* Date pills */}
            <View style={styles.datesContainer}>
              {dates.map((date, index) => (
                <View
                  key={date}
                  style={[
                    styles.datePill,
                    index === 0 && styles.datePillActive,
                  ]}
                >
                  <BlurView
                    intensity={40}
                    tint="dark"
                    style={styles.datePillBlur}
                  >
                    <Text style={styles.dateNumber}>{date}</Text>
                    {index === 0 && (
                      <Text style={styles.dateMonth}>Aug</Text>
                    )}
                  </BlurView>
                </View>
              ))}
            </View>

            {/* Center action button */}
            <View style={styles.centerButtonContainer}>
              <TouchableOpacity style={styles.centerButton} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#6366F1', '#4F46E5', '#4338CA']}
                  style={styles.centerButtonGradient}
                >
                  <BlurView intensity={20} tint="dark" style={styles.centerButtonBlur}>
                    <Text style={styles.centerButtonIcon}>⚡</Text>
                  </BlurView>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Bottom navigation */}
            <View style={styles.bottomNav}>
              <TouchableOpacity style={styles.navIcon}>
                <Text style={styles.navIconText}>🏠</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navIcon}>
                <Text style={styles.navIconText}>🔍</Text>
              </TouchableOpacity>
              <View style={styles.navSpacer} />
              <TouchableOpacity style={styles.navIcon}>
                <Text style={styles.navIconText}>🔔</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navIcon}>
                <Text style={styles.navIconText}>👤</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  mainCardWrapper: {
    flex: 1,
    marginBottom: 20,
  },
  neumorphicCard: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -8, height: -8 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 10,
  },
  cardBlur: {
    flex: 1,
    borderRadius: 40,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    padding: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  topLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  topCenter: {
    position: 'absolute',
    left: '50%',
    marginLeft: -20,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(203, 213, 225, 0.5)',
  },
  profileBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 18,
  },
  menuButton: {
    gap: 4,
    padding: 8,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#94A3B8',
    borderRadius: 1,
  },
  recentsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockEmoji: {
    fontSize: 16,
  },
  recentsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  gridIcon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 16,
    height: 16,
    gap: 3,
  },
  gridDot: {
    width: 5,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
  },
  projectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  projectWrapper: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 20,
  },
  projectCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    marginBottom: 8,
    backgroundColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  projectIconContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  projectIconBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectIcon: {
    fontSize: 32,
  },
  projectTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  projectSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  paginationDotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#64748B',
  },
  bottomPlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  placeholderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(203, 213, 225, 0.3)',
  },
  placeholderIconLarge: {
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(203, 213, 225, 0.3)',
  },
  bottomCardWrapper: {
    height: height * 0.35,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  darkCard: {
    flex: 1,
    padding: 20,
    position: 'relative',
  },
  glowPurple: {
    position: 'absolute',
    top: -50,
    left: 20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#8B5CF6',
    opacity: 0.15,
    blur: 50,
  },
  glowBlue: {
    position: 'absolute',
    bottom: -50,
    right: 20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#3B82F6',
    opacity: 0.15,
    blur: 50,
  },
  datesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 30,
  },
  datePill: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
  },
  datePillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.4)',
  },
  datePillBlur: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateMonth: {
    fontSize: 11,
    color: '#A5B4FC',
    fontWeight: '600',
    marginTop: 2,
  },
  centerButtonContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  centerButtonGradient: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
  },
  centerButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonIcon: {
    fontSize: 32,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navIcon: {
    padding: 8,
  },
  navIconText: {
    fontSize: 20,
    opacity: 0.5,
  },
  navSpacer: {
    width: 64,
  },
});
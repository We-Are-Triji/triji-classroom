import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { ProfileSection, InfoRow } from '../components';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
    program: '',
    yearLevel: '',
    enrollmentStatus: 'Active',
    dateOfBirth: '',
    phone: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    achievements: [],
  });
  const [loading, setLoading] = useState(true);

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Function to fetch user data
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || user.email,
            studentId:
              data.studentId ||
              'ST' +
                Math.floor(Math.random() * 100000)
                  .toString()
                  .padStart(5, '0'),
            program: data.program || 'Computer Science',
            yearLevel: data.yearLevel || '3rd Year',
            enrollmentStatus: data.enrollmentStatus || 'Active',
            dateOfBirth: data.dateOfBirth || 'January 15, 2002',
            phone: data.phone || '+63 912 345 6789',
            address: data.address || 'Manila, Philippines',
            emergencyContactName: data.emergencyContactName || 'Parent/Guardian',
            emergencyContactPhone: data.emergencyContactPhone || '+63 912 345 6790',
            achievements: data.achievements || [
              "Dean's List - Fall 2023",
              'Programming Competition - 2nd Place',
              'Academic Excellence Award',
            ],
          });
        }
      }
    } catch (error) {
      console.log('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const getInitials = () => {
    const first = userData.firstName || 'S';
    const last = userData.lastName || 'T';
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1B2845', '#23243a', '#22305a', '#3a5a8c', '#23243a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Enhanced gradient background */}
      <LinearGradient
        colors={['#1B2845', '#23243a', '#22305a', '#3a5a8c', '#23243a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Background elements removed */}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Profile</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Feather name="edit-2" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header Card */}
        <BlurView intensity={120} tint="dark" style={styles.profileHeaderCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#FF9500', '#FFD23F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
              </LinearGradient>
              <TouchableOpacity style={styles.editAvatarButton}>
                <Feather name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {userData.firstName} {userData.lastName}
              </Text>
              <Text style={styles.profileSubtitle}>
                {userData.program} • {userData.yearLevel}
              </Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: '#22e584' }]} />
                <Text style={styles.statusText}>{userData.enrollmentStatus}</Text>
              </View>
            </View>
          </View>
        </BlurView>

        {/* Personal Information */}
        <ProfileSection title="Personal Information">
          <InfoRow
            icon="user"
            label="Full Name"
            value={`${userData.firstName} ${userData.lastName}`}
            iconColor="#FF9500"
          />
          <InfoRow icon="mail" label="Email Address" value={userData.email} iconColor="#007AFF" />
          <InfoRow icon="phone" label="Phone Number" value={userData.phone} iconColor="#34C759" />
          <InfoRow
            icon="calendar"
            label="Date of Birth"
            value={userData.dateOfBirth}
            iconColor="#AF52DE"
          />
          <InfoRow
            icon="map-pin"
            label="Address"
            value={userData.address}
            iconColor="#FF6B35"
            showDivider={false}
          />
        </ProfileSection>

        {/* Academic Information */}
        <ProfileSection title="Academic Information">
          <InfoRow
            icon="credit-card"
            label="Student ID"
            value={userData.studentId}
            iconColor="#22e584"
          />
          <InfoRow icon="book" label="Program" value={userData.program} iconColor="#007AFF" />
          <InfoRow
            icon="layers"
            label="Year Level"
            value={userData.yearLevel}
            iconColor="#AF52DE"
            showDivider={false}
          />
        </ProfileSection>

        {/* Emergency Contact */}
        <ProfileSection title="Emergency Contact">
          <InfoRow
            icon="user-plus"
            label="Contact Name"
            value={userData.emergencyContactName}
            iconColor="#FF6B35"
          />
          <InfoRow
            icon="phone-call"
            label="Contact Phone"
            value={userData.emergencyContactPhone}
            iconColor="#34C759"
            showDivider={false}
          />
        </ProfileSection>

        {/* Achievements */}
        <ProfileSection title="Achievements & Awards">
          {userData.achievements.map((achievement, index) => (
            <View
              key={index}
              style={[
                styles.achievementItem,
                index === userData.achievements.length - 1 && styles.lastAchievementItem,
              ]}
            >
              <View style={styles.achievementIcon}>
                <Feather name="award" size={16} color="#FFD23F" />
              </View>
              <Text style={styles.achievementText}>{achievement}</Text>
            </View>
          ))}
        </ProfileSection>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    minHeight: '100vh',
    minWidth: '100vw',
    maxWidth: '100vw',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
  },
  // Floating elements removed
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minHeight: '100%',
    maxHeight: '100%',
    width: '100%',
    overflow: 'auto',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'web' ? 100 : 80,
    minWidth: '100%',
    width: '100%',
  },
  profileHeaderCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 122, 255, 0.15), 0 4px 8px rgba(0, 122, 255, 0.1)',
        backdropFilter: 'blur(20px)',
      },
    }),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#b6c2d1',
    marginBottom: 12,
    opacity: 0.9,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 229, 132, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#22e584',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  lastAchievementItem: {
    borderBottomWidth: 0,
  },
  achievementIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 210, 63, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  achievementText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: Platform.OS === 'web' ? 40 : 30,
  },
});

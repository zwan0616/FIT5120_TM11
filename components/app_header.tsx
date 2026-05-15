import SideMenu from '@/components/side_menu';
import ProfileButton from '@/components/profile/ProfileButton';
import { Menu } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AppHeaderProps = {
  title?: string;
};

export default function AppHeader({
  title = 'Nutriheros',
}: AppHeaderProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleOpenMenu = () => {
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
  };

  return (
    <>
      <View style={styles.header}>
        {/* Menu button that opens the shared side drawer */}
        <TouchableOpacity style={styles.menuButton} onPress={handleOpenMenu}>
          <Menu size={30} color="#B45309" />
        </TouchableOpacity>

        {/* Shared page title */}
        <Text style={styles.headerTitle}>{title}</Text>

        {/* Profile button — navigates to the profile page */}
        <ProfileButton />
      </View>

      {/* Shared slide-out menu for the main app pages */}
      <SideMenu visible={menuVisible} onClose={handleCloseMenu} />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#B45309',
  },
  headerRightPlaceholder: {
    width: 44,
    height: 44,
  },
});

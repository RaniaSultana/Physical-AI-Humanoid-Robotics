/**
 * Custom Navbar Content component to integrate UserProfile with logout.
 * Swaps Login link for UserProfile when authenticated.
 */

import React from 'react';
import { useThemeConfig } from '@docusaurus/theme-common';
import { useLocation } from '@docusaurus/router';
import NavbarItem from '@theme/NavbarItem';
import NavbarColorModeToggle from '@theme/Navbar/ColorModeToggle';
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle';
import NavbarLogo from '@theme/Navbar/Logo';
import NavbarSearch from '@theme/Navbar/Search';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { UserProfile } from '../../../components/Auth/UserProfile';
import { LanguageToggle } from '../../../components/Navbar/LanguageToggle';
import { useAuth } from '../../../context/AuthContext';
import styles from './styles.module.css';

function useNavbarItems() {
  return useThemeConfig().navbar.items;
}

function NavbarItems({ items }: { items: any[] }) {
  return (
    <>
      {items.map((item, i) => (
        <NavbarItem {...item} key={i} />
      ))}
    </>
  );
}

function NavbarContentLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="navbar__inner">
      <div className="navbar__items">{left}</div>
      <div className="navbar__items navbar__items--right">{right}</div>
    </div>
  );
}

function AuthAwareNavbarItem() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Don't show anything while loading to avoid flicker
  if (isLoading) {
    return <div className={styles.authPlaceholder} />;
  }

  if (isAuthenticated) {
    return <UserProfile />;
  }

  // Show login link when not authenticated
  const isOnAuthPage = location.pathname.startsWith('/auth/');
  if (isOnAuthPage) {
    return null;
  }

  return (
    <a href="/auth/login" className="navbar__item navbar__link">
      Login
    </a>
  );
}

export default function NavbarContent(): JSX.Element {
  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);

  // Filter out the login item from right items since we handle it separately
  const filteredRightItems = rightItems.filter(
    (item: any) => !(item.to === '/auth/login' || item.href === '/auth/login')
  );

  return (
    <NavbarContentLayout
      left={
        <>
          <NavbarMobileSidebarToggle />
          <NavbarLogo />
          <NavbarItems items={leftItems} />
        </>
      }
      right={
        <>
          <NavbarItems items={filteredRightItems} />
          <BrowserOnly fallback={null}>
            {() => <LanguageToggle />}
          </BrowserOnly>
          <NavbarColorModeToggle className={styles.colorModeToggle} />
          <NavbarSearch />
          <BrowserOnly fallback={<div className={styles.authPlaceholder} />}>
            {() => <AuthAwareNavbarItem />}
          </BrowserOnly>
        </>
      }
    />
  );
}

function splitNavbarItems(items: any[]): [any[], any[]] {
  const leftItems = items.filter((item) => item.position !== 'right');
  const rightItems = items.filter((item) => item.position === 'right');
  return [leftItems, rightItems];
}

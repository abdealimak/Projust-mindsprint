import React from 'react';
import { getProfile } from '@/lib/data';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return (
    <AppShell profile={profile}>
      {children}
    </AppShell>
  );
}

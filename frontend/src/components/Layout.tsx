import { Outlet } from 'react-router-dom';
import { AppShell } from './AppShell';

export const Layout = () => (
  <AppShell>
    <Outlet />
  </AppShell>
);

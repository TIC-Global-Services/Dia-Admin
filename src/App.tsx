import { useEffect, useState, type ReactElement } from 'react';
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import { Icon, Mark, type IconName } from './icons';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import OrderDetail from './pages/OrderDetail';
import Orders from './pages/Orders';
import Products from './pages/Products';
import { Access } from './pages/Access';
import { People } from './pages/People';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Profile from './pages/Profile';
import SetPassword from './pages/SetPassword';
import { Banners, Categories, Offers, Pages, Shipping } from './pages/Simple';
import { SearchBar } from './Search';

type NavItem = [path: string, label: string, icon: IconName, permission?: string];
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Sales', items: [['/', 'Overview', 'overview'], ['/orders', 'Orders', 'orders', 'orders'], ['/customers', 'Customers', 'users', 'orders'], ['/offers', 'Offers', 'offers', 'offers']] },
  { group: 'Catalogue', items: [['/products', 'Pieces', 'products', 'catalogue'], ['/categories', 'Collections', 'categories', 'catalogue']] },
  { group: 'Fulfilment', items: [['/shipping', 'Shipping', 'shipping', 'shipping']] },
  { group: 'Site', items: [['/pages', 'Pages', 'pages', 'content'], ['/banners', 'Banners', 'banners', 'content']] },
  { group: 'Admin', items: [['/users', 'People', 'users', 'people'], ['/access', 'Access', 'shield', 'people'], ['/settings', 'Settings', 'settings', 'settings']] },
];

function Guard({ permission, children }: { permission?: string; children: ReactElement }) {
  const { can } = useAuth();
  if (!permission || can(permission)) return children;
  return (
    <div className="page forbidden">
      <h1>No access</h1>
      <p className="muted">Your role does not include this area. Ask an Admin if you need it.</p>
      <Link to="/" className="btn">Back to overview</Link>
    </div>
  );
}

function Shell() {
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [toPack, setToPack] = useState(0);
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname]);
  // The one queue that needs action gets a count in the nav: orders waiting to be packed.
  useEffect(() => {
    if (!can('orders')) return;
    api.get('/admin/stats/overview').then((s) => setToPack(s.orders.toPack)).catch(() => undefined);
  }, [loc.pathname, can]);

  const initials = String(user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <div className="app">
      <div className="brand">
        <Mark size={26} />
        <span><b>Dia Diamonds</b><small>Back office</small></span>
      </div>
      <header className="topbar">
        <div className="left">
          <button className="icon menu-btn" aria-label="Menu" onClick={() => setOpen((o) => !o)}><Icon name={open ? 'x' : 'menu'} /></button>
          <Mark size={22} /> Dia Diamonds
        </div>
        <SearchBar />
        <div className="account">
          <Link to="/profile" className="who-link" title="Your profile"><span>{user?.name ?? user?.email}</span><div className="avatar" aria-hidden>{initials}</div></Link>
          <button className="icon" aria-label="Sign out" title="Sign out" onClick={logout}><Icon name="out" /></button>
        </div>
      </header>
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <nav aria-label="Main">
          {NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i[3] || can(i[3])) })).filter((g) => g.items.length).map((g) => (
            <div key={g.group} style={{ display: 'contents' }}>
              <div className="nav-group">{g.group}</div>
              {g.items.map(([to, label, icon]) => (
                <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav${isActive ? ' active' : ''}`}>
                  <Icon name={icon} />
                  {label}
                  {to === '/orders' && toPack > 0 && <span className="count" title="Orders to pack">{toPack}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="sheet">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Guard permission="orders"><Orders /></Guard>} />
          <Route path="/orders/:id" element={<Guard permission="orders"><OrderDetail /></Guard>} />
          <Route path="/products" element={<Guard permission="catalogue"><Products /></Guard>} />
          <Route path="/categories" element={<Guard permission="catalogue"><Categories /></Guard>} />
          <Route path="/offers" element={<Guard permission="offers"><Offers /></Guard>} />
          <Route path="/shipping" element={<Guard permission="shipping"><Shipping /></Guard>} />
          <Route path="/pages" element={<Guard permission="content"><Pages /></Guard>} />
          <Route path="/banners" element={<Guard permission="content"><Banners /></Guard>} />
          <Route path="/users" element={<Guard permission="people"><People /></Guard>} />
          <Route path="/access" element={<Guard permission="people"><Access /></Guard>} />
          <Route path="/settings" element={<Guard permission="settings"><Settings /></Guard>} />
          <Route path="/customers" element={<Guard permission="orders"><Customers /></Guard>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  // The emailed set-password link opens here, signed in or not.
  if (window.location.pathname === '/reset-password') return <SetPassword />;
  if (loading) return <p className="muted center">Loading…</p>;
  if (!user) return <Login />;
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

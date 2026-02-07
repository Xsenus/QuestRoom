import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './components/AboutPage';
import RulesPage from './components/RulesPage';
import CertificatePage from './components/CertificatePage';
import ReviewsPage from './components/ReviewsPage';
import PromotionsPage from './components/PromotionsPage';
import TeaZonesPage from './components/TeaZonesPage';
import QuestDetailPage from './pages/QuestDetailPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/AdminLayout';
import AdminHomePage from './pages/admin/AdminHomePage';
import QuestsPage from './pages/admin/QuestsPage';
import SettingsPage from './pages/admin/SettingsPage';
import BookingsPage, { BookingsMobileTablePage } from './pages/admin/BookingsPage';
import BookingsImportPage from './pages/admin/BookingsImportPage';
import RulesAdminPage from './pages/admin/RulesPage';
import AboutAdminPage from './pages/admin/AboutPage';
import CertificatesAdminPage from './pages/admin/CertificatesPage';
import CertificateOrdersAdminPage from './pages/admin/CertificateOrdersPage';
import ReviewsAdminPage from './pages/admin/ReviewsAdminPage';
import PromotionsAdminPage from './pages/admin/PromotionsAdminPage';
import TeaZonesAdminPage from './pages/admin/TeaZonesAdminPage';
import PromoCodesPage from './pages/admin/PromoCodesPage';
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import ImageLibraryPage from './pages/admin/ImageLibraryPage';
import ProtectedRoute from './components/ProtectedRoute';
import PricingRulesPage from './pages/admin/PricingRulesPage';
import ScrollToTopButton from './components/ScrollToTopButton';
import ProductionCalendarPage from './pages/admin/ProductionCalendarPage';
import StandardExtraServicesPage from './pages/admin/StandardExtraServicesPage';
import { api } from './lib/api';
import { Settings } from './lib/types';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const navigate = useNavigate();
  const [publicSettings, setPublicSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getSettings();
        setPublicSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    navigate('/');
  };

  const fallbackGradient = {
    from: '#070816',
    via: '#160a2e',
    to: '#2c0b3f',
  };

  const backgroundGradient = {
    from: publicSettings?.backgroundGradientFrom || fallbackGradient.from,
    via: publicSettings?.backgroundGradientVia || fallbackGradient.via,
    to: publicSettings?.backgroundGradientTo || fallbackGradient.to,
  };

  return (
    <Routes>
      <Route path="/adm/login" element={<LoginPage />} />

      <Route
        path="/adm/*"
        element={
          <ProtectedRoute>
            <Routes>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminHomePage />} />
                <Route path="overview" element={<AdminHomePage />} />
                <Route path="quests" element={<QuestsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="bookings/mobile-table" element={<BookingsMobileTablePage />} />
                <Route path="bookings/import" element={<BookingsImportPage />} />
                <Route path="pricing" element={<PricingRulesPage />} />
                <Route path="production-calendar" element={<ProductionCalendarPage />} />
                <Route path="rules" element={<RulesAdminPage />} />
                <Route path="about" element={<AboutAdminPage />} />
                <Route path="certificates" element={<CertificatesAdminPage />} />
                <Route path="certificate-orders" element={<CertificateOrdersAdminPage />} />
                <Route path="reviews" element={<ReviewsAdminPage />} />
                <Route path="promotions" element={<PromotionsAdminPage />} />
                <Route path="tea-zones" element={<TeaZonesAdminPage />} />
                <Route path="images" element={<ImageLibraryPage />} />
                <Route path="extra-services" element={<StandardExtraServicesPage />} />
                <Route path="promo-codes" element={<PromoCodesPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </ProtectedRoute>
        }
      />

      <Route
        path="/*"
        element={
          <div
            className="min-h-screen"
            style={{
              background: `linear-gradient(135deg, ${backgroundGradient.from}, ${backgroundGradient.via}, ${backgroundGradient.to})`,
            }}
          >
            <Header currentPage={currentPage} setCurrentPage={handlePageChange} />
            <Routes>
              <Route path="/" element={<Navigate to="/quests/adults" replace />} />
              <Route path="/quests" element={<Navigate to="/quests/adults" replace />} />
              <Route path="/quests/:category" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/certificate" element={<CertificatePage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/tea-zones" element={<TeaZonesPage />} />
              <Route path="/quest/:id" element={<QuestDetailPage />} />
            </Routes>
            <ScrollToTopButton />
            <Footer setCurrentPage={handlePageChange} />
          </div>
        }
      />
    </Routes>
  );
}

export default App;

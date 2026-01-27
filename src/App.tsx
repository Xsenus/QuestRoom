import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './components/AboutPage';
import RulesPage from './components/RulesPage';
import CertificatePage from './components/CertificatePage';
import ReviewsPage from './components/ReviewsPage';
import PromotionsPage from './components/PromotionsPage';
import QuestDetailPage from './pages/QuestDetailPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/AdminLayout';
import QuestsPage from './pages/admin/QuestsPage';
import SettingsPage from './pages/admin/SettingsPage';
import BookingsPage from './pages/admin/BookingsPage';
import RulesAdminPage from './pages/admin/RulesPage';
import AboutAdminPage from './pages/admin/AboutPage';
import CertificatesAdminPage from './pages/admin/CertificatesPage';
import CertificateOrdersAdminPage from './pages/admin/CertificateOrdersPage';
import ReviewsAdminPage from './pages/admin/ReviewsAdminPage';
import PromotionsAdminPage from './pages/admin/PromotionsAdminPage';
import PromoCodesPage from './pages/admin/PromoCodesPage';
import ProtectedRoute from './components/ProtectedRoute';
import PricingRulesPage from './pages/admin/PricingRulesPage';
import ScrollToTopButton from './components/ScrollToTopButton';
import ProductionCalendarPage from './pages/admin/ProductionCalendarPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const navigate = useNavigate();

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    navigate('/');
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
                <Route index element={<QuestsPage />} />
                <Route path="quests" element={<QuestsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="pricing" element={<PricingRulesPage />} />
                <Route path="production-calendar" element={<ProductionCalendarPage />} />
                <Route path="rules" element={<RulesAdminPage />} />
                <Route path="about" element={<AboutAdminPage />} />
                <Route path="certificates" element={<CertificatesAdminPage />} />
                <Route path="certificate-orders" element={<CertificateOrdersAdminPage />} />
                <Route path="reviews" element={<ReviewsAdminPage />} />
                <Route path="promotions" element={<PromotionsAdminPage />} />
                <Route path="promo-codes" element={<PromoCodesPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </ProtectedRoute>
        }
      />

      <Route
        path="/*"
        element={
          <div className="min-h-screen bg-gradient-to-br from-[#0b0f2a] via-[#24124a] to-[#4a1362]">
            <Header currentPage={currentPage} setCurrentPage={handlePageChange} />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/certificate" element={<CertificatePage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
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

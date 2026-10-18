import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TranslationProvider } from './context/TranslationContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { AuthProvider } from './context/AuthContext';

// Layouts for strict architectural boundary separation
import { PassengerLayout } from './layouts/PassengerLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Public Passenger Pages
import { HomePage } from './pages/passenger/HomePage';
import { FindBusPage } from './pages/passenger/FindBusPage';
import { MyTripsPage } from './pages/passenger/MyTripsPage';
import { HowItWorksPage } from './pages/passenger/HowItWorksPage';
import { HelpFeedbackPage } from './pages/passenger/HelpFeedbackPage';
import { CheckoutPage } from './pages/passenger/CheckoutPage';
import { BookingConfirmationPage } from './pages/passenger/BookingConfirmationPage';

// Internal Admin & ML Portal Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { DemandPredictionPage } from './pages/admin/DemandPredictionPage';
import { OvercrowdingRiskPage } from './pages/admin/OvercrowdingRiskPage';
import { XAIExplanationPage } from './pages/admin/XAIExplanationPage';
import { AllocationManagerPage } from './pages/admin/AllocationManagerPage';
import { CounterfactualLabPage } from './pages/admin/CounterfactualLabPage';
import { BatchEvalPage } from './pages/admin/BatchEvalPage';
import { PolicyCalibrationPage } from './pages/admin/PolicyCalibrationPage';
import { TradeoffPage } from './pages/admin/TradeoffPage';
import { BaselinesPage } from './pages/admin/BaselinesPage';
import { FleetRecommendationsPage } from './pages/admin/FleetRecommendationsPage';
import { HCIEvaluationPage } from './pages/admin/HciEvaluationPage.jsx';

export function App() {
  return (
    <TranslationProvider>
      <AccessibilityProvider>
        <AuthProvider>
        <Router>
          <Routes>
            {/* 1. Public Passenger Booking Workspace (Strictly isolated from internal ML tooling) */}
            <Route element={<PassengerLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/find-bus" element={<FindBusPage />} />
              <Route path="/live-tracking" element={<Navigate to="/" replace />} />
              <Route path="/my-trips" element={<MyTripsPage />} />
              <Route path="/history" element={<MyTripsPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/help" element={<HelpFeedbackPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/passenger-details" element={<CheckoutPage />} />
              <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
              <Route path="/ticket/:pnr" element={<BookingConfirmationPage />} />
            </Route>

          {/* Dedicated Admin Authentication Endpoint */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/agent/*" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/ml-dashboard" element={<Navigate to="/admin" replace />} />

          {/* 3. Internal Admin & Research Portal Workspace (Protected by AdminAuthGuard) */}
          <Route element={<AdminLayout />}>
            {/* Primary /admin routes */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/demand" element={<DemandPredictionPage />} />
            <Route path="/admin/overcrowding" element={<OvercrowdingRiskPage />} />
            <Route path="/admin/xai" element={<XAIExplanationPage />} />
            <Route path="/admin/allocation" element={<AllocationManagerPage />} />
            <Route path="/admin/counterfactual" element={<CounterfactualLabPage />} />
            <Route path="/admin/batch-eval" element={<BatchEvalPage />} />
            <Route path="/admin/calibration" element={<PolicyCalibrationPage />} />
            <Route path="/admin/tradeoff" element={<TradeoffPage />} />
            <Route path="/admin/baselines" element={<BaselinesPage />} />
            <Route path="/admin/recommendations" element={<FleetRecommendationsPage />} />
            <Route path="/admin/hci-eval" element={<HCIEvaluationPage />} />
          </Route>

          {/* Catch-all route redirects to public passenger home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
    </AccessibilityProvider>
    </TranslationProvider>
  );
}

export default App;

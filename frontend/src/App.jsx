 import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import RequireAdmin from "./components/RequireAdmin";
import RequireAuth from "./components/RequireAuth";
import RequireProvider from "./components/RequireProvider";
import VerifyEmail from "./pages/VerifyEmail";
import ResendVerification from "./pages/ResendVerification";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyBookings from "./pages/MyBookings";
import MyQuotes from "./pages/MyQuotes";
import LeaveReview from "./pages/LeaveReview";
import Messages from "./pages/Messages";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderBookings from "./pages/ProviderBookings";
import ProviderQuotes from "./pages/ProviderQuotes";
import AdminUsers from "./pages/AdminUsers";
import ProviderSettings from "./pages/ProviderSettings";
import PayVerify from "./pages/PayVerify";
import ProviderProfile from "./pages/ProviderProfile";
import DemandRequests from "./pages/DemandRequests";
import ProviderDemands from "./pages/ProviderDemands";
import ProviderWallet from "./pages/ProviderWallet";
import AdminWithdrawals from "./pages/AdminWithdrawals";

import PrivacyPage from "./pages/PrivacyPage";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<Terms />} />
        <Route path="contact" element={<Contact />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
  path="/resend-verification"
  element={<ResendVerification />}
/>

        <Route
          path="my-bookings"
          element={
            <RequireAuth>
              <MyBookings />
            </RequireAuth>
          }
        />

        <Route
          path="my-quotes"
          element={
            <RequireAuth>
              <MyQuotes />
            </RequireAuth>
          }
        />
        <Route
  path="demand-requests"
  element={
    <RequireAuth>
      <DemandRequests />
    </RequireAuth>
  }
/>

        <Route
          path="leave-review/:bookingId"
          element={
            <RequireAuth>
              <LeaveReview />
            </RequireAuth>
          }
        />

         <Route
  path="/admin/withdrawals"
  element={
    <RequireAuth>
      <AdminWithdrawals />
    </RequireAuth>
  }
/>

        <Route
          path="messages/:bookingId"
          element={
            <RequireAuth>
              <Messages />
            </RequireAuth>
          }
        />

        <Route
          path="provider"
          element={
            <RequireProvider>
              <ProviderDashboard />
            </RequireProvider>
          }
        />

        <Route
          path="provider/bookings"
          element={
            <RequireProvider>
              <ProviderBookings />
            </RequireProvider>
          }
        />

        <Route
          path="provider/quotes"
          element={
            <RequireProvider>
              <ProviderQuotes />
            </RequireProvider>
          }
        />

        <Route path="provider/:id" element={<ProviderProfile />} />

        <Route
          path="provider-settings"
          element={
            <RequireProvider>
              <ProviderSettings />
            </RequireProvider>
          }
        />

        <Route
  path="provider/demands"
  element={
    <RequireProvider>
      <ProviderDemands />
    </RequireProvider>
  }
/>
<Route
  path="/provider/wallet"
  element={<ProviderWallet />}
/>



        <Route
          path="admin/users"
          element={
            <RequireAdmin>
              <AdminUsers />
            </RequireAdmin>
          }
        />

        <Route path="pay/verify" element={<PayVerify />} />

        <Route path="*" element={<div style={{ padding: 24 }}>Not found</div>} />
      </Route>
    </Routes>
  );
}
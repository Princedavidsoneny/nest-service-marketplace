 // frontend/src/App.jsx
import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
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

import RequireAdmin from "./components/RequireAdmin";
import AdminUsers from "./pages/AdminUsers";


import PayVerify from "./pages/PayVerify";
import ProviderProfile from "./pages/ProviderProfile";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* public */}
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
         

        {/* customer */}
        <Route path="my-bookings" element={<MyBookings />} />
        <Route path="my-quotes" element={<MyQuotes />} />

        {/* IMPORTANT: must include :bookingId */}
        <Route path="leave-review/:bookingId" element={<LeaveReview />} />
        <Route path="messages/:bookingId" element={<Messages />} />

        {/* provider */}
        <Route path="provider" element={<ProviderDashboard />} />
        <Route path="provider/bookings" element={<ProviderBookings />} />
        <Route path="provider/quotes" element={<ProviderQuotes />} />
        <Route path="/provider/:id" element={<ProviderProfile />} />

        {/* admin */}
        <Route
          path="admin/users"
          element={
            <RequireAdmin>
              <AdminUsers />
            </RequireAdmin>
          }
        />

        {/* payment verify */}
        <Route path="pay/verify" element={<PayVerify />} />

        {/* fallback */}
        <Route path="*" element={<div style={{ padding: 24 }}>Not found</div>} />
      </Route>
    </Routes>

    


  );
}
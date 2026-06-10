 import { useEffect, useMemo, useState } from "react";
import {
  fetchMyProviderProfile,
  updateMyProviderProfile,
  uploadProviderProfileImage,
} from "../services";
import { getToken } from "../auth";

const API = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000"
).replace(/\/+$/, "");

const SERVICE_CATEGORIES = [
  "plumber",
  "driver",
  "electrician",
  "cleaner",
  "mechanic",
  "painter",
  "carpenter",
  "generator repair",
  "appliance repair",
  "moving service",
  "labourer",
  "tiler",
  "welder",
  "technician",
  "chef",
  "general",
];

function authHeaders() {
  const token = getToken();
  return token
    ? { Accept: "application/json", Authorization: `Bearer ${token}` }
    : { Accept: "application/json" };
}

async function toJson(res) {
  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

async function fetchBanks() {
  const res = await fetch(`${API}/payouts/banks`, {
    headers: authHeaders(),
  });
  return toJson(res);
}

async function fetchPayoutProfile() {
  const res = await fetch(`${API}/payouts/me`, {
    headers: authHeaders(),
  });
  return toJson(res);
}

async function resolveAccount(payload) {
  const res = await fetch(`${API}/payouts/resolve-account`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return toJson(res);
}

async function savePayoutSetup(payload) {
  const res = await fetch(`${API}/payouts/setup`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return toJson(res);
}

export default function ProviderSettings() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [verifyingAccount, setVerifyingAccount] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [payoutError, setPayoutError] = useState("");
  const [payoutSuccess, setPayoutSuccess] = useState("");

  const [banks, setBanks] = useState([]);
  const [bankSearch, setBankSearch] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    bio: "",
    profileImage: "",
    providerTag: "",
    serviceCategory: "",
    phone: "",
    city: "",
    address: "",
    latitude: "",
    longitude: "",
  });

  const [payoutForm, setPayoutForm] = useState({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
    businessName: "",
    payoutVerified: false,
    paystackSubaccountCode: "",
    platformSplitPercent: 10,
  });

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.code === payoutForm.bankCode) || null,
    [banks, payoutForm.bankCode]
  );

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return banks;

    return banks.filter((bank) =>
      String(bank.name || "").toLowerCase().includes(q)
    );
  }, [banks, bankSearch]);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        setProfileError("");
        setPayoutError("");

        const [provider, payout, bankResponse] = await Promise.all([
          fetchMyProviderProfile(),
          fetchPayoutProfile().catch(() => null),
          fetchBanks().catch(() => ({ banks: [] })),
        ]);

        if (!mounted) return;

        setProfileForm({
          name: provider?.name || "",
          bio: provider?.bio || "",
          profileImage: provider?.profileImage || "",
          providerTag: provider?.providerTag || "",
          serviceCategory: provider?.serviceCategory || "",
          phone: provider?.phone || "",
          city: provider?.city || "",
          address: provider?.address || "",
          latitude: provider?.latitude ?? "",
          longitude: provider?.longitude ?? "",
        });

        setPayoutForm({
          bankName: payout?.bankName || "",
          bankCode: payout?.bankCode || "",
          accountNumber: payout?.accountNumber || "",
          accountName: payout?.accountName || "",
          businessName: payout?.payoutBusinessName || provider?.name || "",
          payoutVerified: Boolean(payout?.payoutVerified),
          paystackSubaccountCode: payout?.paystackSubaccountCode || "",
          platformSplitPercent: Number(payout?.platformSplitPercent || 10),
        });

        const cleanBanks = Array.isArray(bankResponse?.banks)
          ? bankResponse.banks
          : [];

        setBanks(
          cleanBanks.sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""))
          )
        );
      } catch (error) {
        setProfileError(error.message || "Failed to load settings");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPage();

    return () => {
      mounted = false;
    };
  }, []);

  function onProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  }

  function onPayoutChange(event) {
    const { name, value } = event.target;

    if (name === "bankCode") {
      const bank = banks.find((item) => item.code === value);

      setPayoutForm((prev) => ({
        ...prev,
        bankCode: value,
        bankName: bank?.name || "",
        accountName: "",
        payoutVerified: false,
        paystackSubaccountCode: "",
      }));

      setPayoutError("");
      setPayoutSuccess("");
      return;
    }

    if (name === "accountNumber") {
      const onlyNumbers = value.replace(/\D/g, "").slice(0, 10);

      setPayoutForm((prev) => ({
        ...prev,
        accountNumber: onlyNumbers,
        accountName: "",
        payoutVerified: false,
        paystackSubaccountCode: "",
      }));

      setPayoutError("");
      setPayoutSuccess("");
      return;
    }

    setPayoutForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    try {
      setSavingProfile(true);

      let imageValue = profileForm.profileImage;

      if (profileImageFile) {
        const uploadResult = await uploadProviderProfileImage(profileImageFile);
        imageValue =
          uploadResult?.profileImage ||
          uploadResult?.imageUrl ||
          uploadResult?.path ||
          profileForm.profileImage;
      }

      const updated = await updateMyProviderProfile({
        name: profileForm.name,
        bio: profileForm.bio,
        profileImage: imageValue,
        serviceCategory: profileForm.serviceCategory,
        phone: profileForm.phone,
        city: profileForm.city,
        address: profileForm.address,
        latitude: profileForm.latitude === "" ? null : Number(profileForm.latitude),
        longitude:
          profileForm.longitude === "" ? null : Number(profileForm.longitude),
      });

      setProfileForm((prev) => ({
        ...prev,
        name: updated?.name || prev.name,
        bio: updated?.bio || "",
        profileImage: updated?.profileImage || imageValue || "",
        providerTag: updated?.providerTag || prev.providerTag,
        serviceCategory: updated?.serviceCategory || "",
        phone: updated?.phone || "",
        city: updated?.city || "",
        address: updated?.address || "",
        latitude: updated?.latitude ?? "",
        longitude: updated?.longitude ?? "",
      }));

      setProfileImageFile(null);
      setProfileSuccess("Profile updated successfully.");
    } catch (error) {
      setProfileError(error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleResolveAccount() {
    setPayoutError("");
    setPayoutSuccess("");

    try {
      if (!payoutForm.bankCode) {
        setPayoutError("Please select a bank first.");
        return;
      }

      if (!payoutForm.accountNumber || payoutForm.accountNumber.length !== 10) {
        setPayoutError("Please enter a valid 10-digit account number.");
        return;
      }

      setVerifyingAccount(true);

      const data = await resolveAccount({
        accountNumber: payoutForm.accountNumber,
        bankCode: payoutForm.bankCode,
      });

      const resolvedName = data?.accountName || "";

      if (!resolvedName) {
        setPayoutError("Account could not be verified. Please check the details.");
        return;
      }

      setPayoutForm((prev) => ({
        ...prev,
        accountName: resolvedName,
      }));

      setPayoutSuccess("Bank account verified successfully.");
    } catch (error) {
      setPayoutError(error.message || "Could not verify account");
    } finally {
      setVerifyingAccount(false);
    }
  }

  async function handlePayoutSave(event) {
    event.preventDefault();
    setPayoutError("");
    setPayoutSuccess("");

    try {
      if (!payoutForm.businessName.trim()) {
        setPayoutError("Please enter a business or personal payout name.");
        return;
      }

      if (!payoutForm.bankName || !payoutForm.bankCode) {
        setPayoutError("Please select a bank.");
        return;
      }

      if (!payoutForm.accountNumber || payoutForm.accountNumber.length !== 10) {
        setPayoutError("Please enter a valid 10-digit account number.");
        return;
      }

      if (!payoutForm.accountName) {
        setPayoutError("Please verify the bank account before saving payout setup.");
        return;
      }

      setSavingPayout(true);

      const result = await savePayoutSetup({
        bankName: payoutForm.bankName,
        bankCode: payoutForm.bankCode,
        accountNumber: payoutForm.accountNumber,
        accountName: payoutForm.accountName,
        businessName: payoutForm.businessName || payoutForm.accountName,
      });

      const provider = result?.provider || {};

      setPayoutForm((prev) => ({
        ...prev,
        bankName: provider.bankName || prev.bankName,
        bankCode: provider.bankCode || prev.bankCode,
        accountNumber: provider.accountNumber || prev.accountNumber,
        accountName: provider.accountName || prev.accountName,
        businessName: provider.payoutBusinessName || prev.businessName,
        payoutVerified: Boolean(provider.payoutVerified),
        paystackSubaccountCode: provider.paystackSubaccountCode || "",
        platformSplitPercent: Number(
          provider.platformSplitPercent || prev.platformSplitPercent || 10
        ),
      }));

      setPayoutSuccess("Payout setup saved successfully.");
    } catch (error) {
      setPayoutError(error.message || "Failed to save payout setup");
    } finally {
      setSavingPayout(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-slate-300">
        Loading provider settings...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Provider Settings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Update your public profile, service category, location, and payout details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="mb-4 text-xl font-semibold">Public Profile</h2>

          {profileError ? (
            <div className="mb-4 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {profileError}
            </div>
          ) : null}

          {profileSuccess ? (
            <div className="mb-4 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
              {profileSuccess}
            </div>
          ) : null}

          <div className="mb-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
            <p className="text-sm text-cyan-200">
              <span className="font-semibold">Provider Tag:</span>{" "}
              {profileForm.providerTag || "Not assigned"}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              This tag helps customers identify the provider who wins a job.
            </p>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Name</label>
              <input
                type="text"
                name="name"
                value={profileForm.name}
                onChange={onProfileChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                placeholder="Provider name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Service Category
              </label>
              <select
                name="serviceCategory"
                value={profileForm.serviceCategory}
                onChange={onProfileChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              >
                <option value="">Select your main service category</option>
                {SERVICE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-400">
                This determines which job requests you receive automatically.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Phone</label>
              <input
                type="text"
                name="phone"
                value={profileForm.phone}
                onChange={onProfileChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                placeholder="e.g. 08012345678"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">City</label>
              <input
                type="text"
                name="city"
                value={profileForm.city}
                onChange={onProfileChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                placeholder="e.g. Owerri"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Address / Area</label>
              <input
                type="text"
                name="address"
                value={profileForm.address}
                onChange={onProfileChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                placeholder="e.g. World Bank Area"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Latitude optional
                </label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={profileForm.latitude}
                  onChange={onProfileChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  placeholder="e.g. 5.485"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Longitude optional
                </label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={profileForm.longitude}
                  onChange={onProfileChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  placeholder="e.g. 7.035"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Bio</label>
              <textarea
                name="bio"
                value={profileForm.bio}
                onChange={onProfileChange}
                rows={5}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                placeholder="Tell customers about your experience and services"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Profile image upload
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Or profile image URL/path
              </label>
              <input
                type="text"
                name="profileImage"
                value={profileForm.profileImage}
                onChange={onProfileChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                placeholder="https://example.com/image.jpg or /uploads/file.jpg"
              />
            </div>

            {profileForm.profileImage ? (
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <img
                  src={profileForm.profileImage}
                  alt="Provider profile"
                  className="h-48 w-full object-cover"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? "Saving profile..." : "Save profile"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="mb-4 text-xl font-semibold">Payout Setup</h2>

          {payoutError ? (
            <div className="mb-4 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {payoutError}
            </div>
          ) : null}

          {payoutSuccess ? (
            <div className="mb-4 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
              {payoutSuccess}
            </div>
          ) : null}

          <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">Status:</span>{" "}
              {payoutForm.payoutVerified ? "Verified and ready" : "Not completed"}
            </p>

            <p className="mt-2 text-sm text-slate-300">
              <span className="font-semibold text-white">Platform share:</span>{" "}
              {payoutForm.platformSplitPercent}% per successful payment
            </p>

            {payoutForm.paystackSubaccountCode ? (
              <p className="mt-2 break-all text-xs text-slate-400">
                Subaccount: {payoutForm.paystackSubaccountCode}
              </p>
            ) : null}
          </div>

          <form onSubmit={handlePayoutSave} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Business or personal payout name
              </label>
              <input
                type="text"
                name="businessName"
                value={payoutForm.businessName}
                onChange={onPayoutChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                placeholder="Business name or your personal name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Search bank
              </label>
              <input
                type="text"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                placeholder="Search bank e.g. Opay, Moniepoint, Access"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Bank</label>
              <select
                name="bankCode"
                value={payoutForm.bankCode}
                onChange={onPayoutChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              >
                <option value="">Select a bank</option>
                {filteredBanks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>

              {selectedBank ? (
                <p className="mt-2 text-xs text-slate-400">
                  Selected bank: {selectedBank.name}
                </p>
              ) : null}

              {banks.length === 0 ? (
                <p className="mt-2 text-xs text-red-300">
                  Bank list could not load. Please refresh or try again.
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Account number
              </label>
              <input
                type="text"
                name="accountNumber"
                value={payoutForm.accountNumber}
                onChange={onPayoutChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                placeholder="10-digit account number"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Resolved account name
              </label>
              <input
                type="text"
                value={payoutForm.accountName}
                readOnly
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-300 outline-none"
                placeholder="Verify account to see account name"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResolveAccount}
                disabled={verifyingAccount}
                className="rounded-xl border border-cyan-500 px-5 py-3 font-semibold text-cyan-400 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifyingAccount ? "Verifying..." : "Verify account"}
              </button>

              <button
                type="submit"
                disabled={savingPayout}
                className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPayout ? "Saving payout..." : "Save payout setup"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
 import { useEffect, useMemo, useState } from "react";
import {
  fetchMyProviderProfile,
  updateMyProviderProfile,
  uploadProviderProfileImage,
} from "../services";

function friendlyError(error) {
  const raw = String(error?.message || "").toLowerCase();

  if (raw.includes("missing token") || raw.includes("invalid token")) {
    return "Please log in again and try.";
  }

  if (raw.includes("forbidden")) {
    return "Only providers can update provider settings.";
  }

  if (raw.includes("valid http") || raw.includes("uploaded image path")) {
    return "Please use a valid image URL or upload a supported image file.";
  }

  if (raw.includes("name is required")) {
    return "Provider name is required.";
  }

  if (
    raw.includes("only jpg") ||
    raw.includes("jpeg") ||
    raw.includes("png") ||
    raw.includes("webp")
  ) {
    return "Only JPG, JPEG, PNG, and WEBP images are allowed.";
  }

  if (raw.includes("file too large")) {
    return "Image is too large. Please choose a smaller file.";
  }

  return "Something went wrong. Please try again.";
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function isValidUrl(value = "") {
  const text = String(value).trim();
  if (!text) return true;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ProviderSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [imageBroken, setImageBroken] = useState(false);

  const [form, setForm] = useState({
    name: "",
    bio: "",
    profileImage: "",
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");
        setMsg("");

        const profile = await fetchMyProviderProfile();

        setForm({
          name: profile?.name || "",
          bio: profile?.bio || "",
          profileImage: profile?.profileImage || "",
        });
      } catch (e) {
        setErr(friendlyError(e));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "profileImage") {
      setImageBroken(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setErr("");
      setMsg("");
      setImageBroken(false);

      const res = await uploadProviderProfileImage(file);
      updateField("profileImage", res?.imageUrl || res?.imagePath || "");

      setMsg("Image uploaded successfully. Click save to keep it on your profile.");
    } catch (e2) {
      setErr(friendlyError(e2));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setErr("");
      setMsg("");
      setImageBroken(false);

      const payload = {
        name: form.name.trim(),
        bio: form.bio.trim(),
        profileImage: form.profileImage.trim(),
      };

      if (!payload.name) {
        setErr("Provider name is required.");
        return;
      }

      if (
        payload.profileImage &&
        !payload.profileImage.startsWith("/uploads/") &&
        !isValidUrl(payload.profileImage)
      ) {
        setErr("Please use a valid image URL or upload an image from your device.");
        return;
      }

      await updateMyProviderProfile(payload);
      setMsg("Provider profile updated successfully.");
    } catch (e2) {
      setErr(friendlyError(e2));
    } finally {
      setSaving(false);
    }
  }

  const previewName = useMemo(
    () => form.name.trim() || "Provider name",
    [form.name]
  );

  const previewBio = useMemo(
    () =>
      form.bio.trim() ||
      "Your provider bio will appear here. Tell customers about your experience, quality of work, and availability.",
    [form.bio]
  );

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Provider Settings
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-300 md:text-lg">
              Update your public provider profile with your display name, photo, and business bio.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
            <div className="text-sm text-slate-300">
              You can either upload an image from your device or paste a direct public image URL.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Loading provider settings...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl"
            >
              <h2 className="text-2xl font-bold text-white">Edit public profile</h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Provider name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Your business or display name"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Upload profile image
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileChange}
                    className="block w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Choose JPG, JPEG, PNG, or WEBP. Max size: 5MB.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Or profile image URL
                  </label>
                  <input
                    value={form.profileImage}
                    onChange={(e) => updateField("profileImage", e.target.value)}
                    placeholder="https://example.com/my-photo.jpg"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Bio</label>
                  <textarea
                    rows={6}
                    value={form.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="Tell customers about your experience, quality of work, and availability."
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                  />
                </div>
              </div>

              {msg ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {msg}
                </div>
              ) : null}

              {err ? (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {err}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Provider Profile"}
                </button>

                {uploading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    Uploading image...
                  </div>
                ) : null}
              </div>
            </form>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white">Live preview</h2>

              <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
                {form.profileImage && !imageBroken ? (
                  <img
                    src={form.profileImage}
                    alt={previewName}
                    className="h-40 w-40 rounded-full object-cover ring-4 ring-cyan-500/20"
                    onError={() => setImageBroken(true)}
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-4xl font-black text-slate-950">
                    {getInitials(previewName)}
                  </div>
                )}

                <div className="mt-5">
                  <h3 className="text-2xl font-bold text-white">{previewName}</h3>
                  <p className="mt-2 text-slate-300">{previewBio}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
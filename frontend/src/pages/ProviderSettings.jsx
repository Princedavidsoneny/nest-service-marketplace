import { useEffect, useState } from "react";
import { fetchMyProviderProfile, updateMyProviderProfile } from "../services";

function friendlyError(error) {
  const raw = String(error?.message || "").toLowerCase();

  if (raw.includes("missing token") || raw.includes("invalid token")) {
    return "Please log in again and try.";
  }
  if (raw.includes("forbidden")) {
    return "Only providers can update provider settings.";
  }
  if (raw.includes("valid http or https url")) {
    return "Please enter a valid image URL that starts with http:// or https://";
  }
  if (raw.includes("name is required")) {
    return "Provider name is required.";
  }

  return "Something went wrong. Please try again.";
}

export default function ProviderSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

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

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setErr("");
      setMsg("");

      const payload = {
        name: form.name.trim(),
        bio: form.bio.trim(),
        profileImage: form.profileImage.trim(),
      };

      await updateMyProviderProfile(payload);
      setMsg("Provider profile updated successfully.");
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Provider Settings
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-300 md:text-lg">
              Update your public provider profile with your real photo, name, and bio.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
            <div className="text-sm text-slate-300">
              Tip: use a clear public image URL for now. You can later upgrade to full image upload.
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
                  <label className="mb-2 block text-sm text-slate-300">Provider name</label>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Your business or display name"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Profile image URL</label>
                  <input
                    value={form.profileImage}
                    onChange={(e) => updateField("profileImage", e.target.value)}
                    placeholder="https://example.com/my-photo.jpg"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Bio</label>
                  <textarea
                    rows={6}
                    value={form.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="Tell customers about your experience, quality of work, and availability."
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
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

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Provider Profile"}
                </button>
              </div>
            </form>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white">Live preview</h2>

              <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
                {form.profileImage ? (
                  <img
                    src={form.profileImage}
                    alt={form.name || "Provider"}
                    className="h-40 w-40 rounded-full object-cover ring-4 ring-cyan-500/20"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-4xl font-black text-slate-950">
                    {(form.name || "P").slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="mt-5">
                  <h3 className="text-2xl font-bold text-white">
                    {form.name || "Provider name"}
                  </h3>
                  <p className="mt-2 text-slate-300">
                    {form.bio || "Your provider bio will appear here."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
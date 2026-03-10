 import { useState } from "react";
import { loginUser } from "../services";
import { saveAuth } from "../auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const data = await loginUser({ email, password });
      saveAuth(data);
      nav(data?.user?.role === "provider" ? "/provider" : "/");
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-3">Login</h2>

      {err && <div className="card error">❌ {err}</div>}

      <form onSubmit={onSubmit} className="grid gap-2">
        <input
  className="w-full p-3 rounded bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

         <input
  type="password"
  className="w-full p-3 rounded bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>


        <button className="btn" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

 import { useState } from "react";
import { registerUser } from "../services";
import { saveAuth } from "../auth";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const data = await registerUser({ name, email, password, role });
      // expect backend returns: { token, user }
      saveAuth(data);
      nav(role === "provider" ? "/provider" : "/");
    } catch (e) {
      setErr(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-3">Register</h2>

      {err && <div className="card error">❌ {err}</div>}

      <form onSubmit={onSubmit} className="grid gap-2">
         <input
  className="w-full p-3 rounded bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Full name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

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


        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="customer">Customer</option>
          <option value="provider">Provider</option>
        </select>

        <button className="btn" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}

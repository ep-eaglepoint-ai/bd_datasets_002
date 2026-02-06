import { useState } from "react";
import { api } from "../services/api";

interface AuthProps {
  onLogin: (token: string) => void;
}

export const Auth = ({ onLogin }: AuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = isLogin
        ? await api.login(email, password)
        : await api.register(email, password);
      localStorage.setItem("token", data.token);
      onLogin(data.token);
    } catch (err) {
      setError("Authentication failed");
    }
  };

  return (
    <div
      className="container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
        <h2 style={{ marginBottom: "24px" }}>
          {isLogin ? "Login" : "Register"}
        </h2>
        {error && <div className="error-message">{error}</div>}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" style={{ padding: "12px" }}>
            {isLogin ? "Login" : "Register"}
          </button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          style={{
            width: "100%",
            marginTop: "16px",
            background: "white",
            color: "black",
          }}
        >
          {isLogin ? "Switch to Register" : "Switch to Login"}
        </button>
      </div>
    </div>
  );
};

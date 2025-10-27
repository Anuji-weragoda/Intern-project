import { useEffect, useState } from "react";
import Card from "../components/Card";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error(err));
  }, []);

  if (!user) return <div className="p-8 text-gray-600">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="User Info">
          <p>
            <strong>Name:</strong> {user.displayName || "N/A"}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
        </Card>
        <Card title="Roles">
          {user.roles && user.roles.length > 0 ? (
            <ul className="list-disc ml-5">{user.roles.map((role: string) => <li key={role}>{role}</li>)}</ul>
          ) : (
            <p>No roles assigned.</p>
          )}
        </Card>
        <Card title="Audit Summary">
          <p>Last login: {user.lastLogin || "N/A"}</p>
          <p>Logins count: {user.loginCount || 0}</p>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

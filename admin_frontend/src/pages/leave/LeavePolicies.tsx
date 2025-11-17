import React, { useEffect, useState } from 'react';
// This page is a simple viewer for leave policies. Integration with backend
// would require a policies endpoint. For now, it renders sample data and
// provides a place to extend.

const samplePolicies = [
  { id: 'annual', name: 'Annual Leave', daysPerYear: 20 },
  { id: 'sick', name: 'Sick Leave', daysPerYear: 10 },
];

const LeavePolicies: React.FC = () => {
  const [policies, setPolicies] = useState(samplePolicies);

  useEffect(() => {
    // If you add a backend endpoint (e.g. GET /api/v1/leave/policies), fetch here
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Leave Policies</h2>
      <div className="space-y-3">
        {policies.map(p => (
          <div key={p.id} className="p-4 bg-white rounded border">
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-gray-600">{p.daysPerYear} days per year</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeavePolicies;

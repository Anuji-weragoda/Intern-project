import React, { useEffect, useState } from 'react';

const STORAGE_KEYS = ['access_token', 'id_token', 'jwt_token', 'token'];

export default function DevTokenSetter() {
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);

  const saveToken = () => {
    if (!value || value.trim().length === 0) return;
    try {
      // write to access_token and id_token for maximum compatibility
      localStorage.setItem('access_token', value.trim());
      localStorage.setItem('id_token', value.trim());
      localStorage.setItem('jwt_token', value.trim());
      // reload so leaveApi picks up the token (resolveToken caches)
      window.location.reload();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save token', e);
      alert('Failed to save token to localStorage');
    }
  };

  const clearToken = () => {
    try {
      for (const k of STORAGE_KEYS) localStorage.removeItem(k);
      setValue('');
      window.location.reload();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear tokens', e);
      alert('Failed to clear tokens');
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setVisible(v => !v)}
          className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
        >
          {visible ? 'Hide' : 'Dev Token'}
        </button>
      </div>
      {visible && (
        <div className="mt-2 bg-white p-3 rounded border border-slate-200 w-full max-w-2xl">
          <label className="text-xs text-slate-600">Paste JWT (for testing only)</label>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full mt-1 p-2 border rounded text-xs font-mono h-24"
            placeholder="paste JWT here"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={saveToken} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Save & Reload</button>
            <button onClick={clearToken} className="px-3 py-1 bg-red-600 text-white rounded text-sm">Clear Tokens</button>
          </div>
        </div>
      )}
    </div>
  );
}

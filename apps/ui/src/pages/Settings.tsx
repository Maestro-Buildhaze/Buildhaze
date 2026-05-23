import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { getStoredClient } from '../lib/auth';
import clsx from 'clsx';

export function Settings() {
  const client = getStoredClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const changeMut = useMutation({
    mutationFn: () => api.auth.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setStatus('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatus('idle'), 3000);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      setStatus('error');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('idle');
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      setStatus('error');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters');
      setStatus('error');
      return;
    }
    changeMut.mutate();
  }

  return (
    <div className="animate-fade-in space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Manage your account preferences</p>
      </div>

      {/* Account info */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Account Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Business Name</label>
            <div className="input cursor-default opacity-60">{client?.businessName}</div>
          </div>
          <div>
            <label className="label">Plan</label>
            <div className="input cursor-default opacity-60 capitalize">{client?.plan}</div>
          </div>
          <div className="col-span-2">
            <label className="label">Email</label>
            <div className="input cursor-default opacity-60">{client?.email}</div>
          </div>
          {client?.domain && (
            <div className="col-span-2">
              <label className="label">Domain</label>
              <div className="input cursor-default opacity-60">{client.domain}</div>
            </div>
          )}
        </div>
      </div>

      {/* Change password */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-white/40" strokeWidth={1.75} />
          Change Password
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {status === 'success' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Password changed successfully
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={changeMut.isPending}
            className="btn-primary"
          >
            {changeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {changeMut.isPending ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

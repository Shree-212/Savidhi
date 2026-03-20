'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import svlogo from '@/assets/svlogo.png';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      // TODO: replace with real API call
      if (email && password) {
        document.cookie = 'savidhi_admin_token=mock_token; path=/';
        router.push('/dashboard');
      } else {
        throw new Error('Please enter email and password');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm bg-card rounded-xl border border-border p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image src={svlogo} alt="Savidhi" width={48} height={48} className="h-12 w-auto" />
          <span className="text-xl font-bold text-foreground">Savidhi Admin</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 px-3 bg-accent border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-10 px-3 bg-accent border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <button
            type="submit"
            className="h-10 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import svlogo from '@/assets/svlogo.png';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
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
            disabled={isLoading}
            className="h-10 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground text-center">Test Credentials</p>
          <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
            <p><strong>Admin:</strong> admin@savidhi.com / admin123</p>
            <p><strong>Manager:</strong> booking@savidhi.in / admin123</p>
            <p><strong>Viewer:</strong> viewer@savidhi.in / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

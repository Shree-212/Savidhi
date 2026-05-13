'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isAuthenticated } from '@/lib/auth';
import { userService } from '@/lib/services';

export default function ProfileEditPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [gotra, setGotra] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login?redirect=/profile/edit');
      return;
    }
    userService.getProfile()
      .then((res) => {
        const d = res.data?.data ?? res.data ?? {};
        setName(d.name ?? '');
        setGotra(d.gotra ?? '');
        setPhone(d.phone ?? '');
      })
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await userService.updateProfile({ name: name.trim(), gotra: gotra.trim() || undefined });
      toast.success('Profile updated');
      router.push('/profile');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="section-container py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:text-primary-500 transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Edit Profile</h1>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full border border-border-DEFAULT rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Gotra <span className="text-text-muted normal-case font-normal">(optional)</span></label>
          <input
            value={gotra}
            onChange={(e) => setGotra(e.target.value)}
            placeholder="e.g. Kashyap"
            className="w-full border border-border-DEFAULT rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Phone</label>
          <input
            value={phone ? `+91 ${phone}` : ''}
            readOnly
            className="w-full border border-border-DEFAULT rounded-xl px-4 py-3 text-sm bg-surface-warm text-text-muted"
          />
          <p className="text-[10px] text-text-muted mt-1">Phone number cannot be changed.</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !name.trim()} size="lg" className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

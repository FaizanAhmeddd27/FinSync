import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Globe, Moon, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/common/ThemeToggle';
import useAuthStore from '@/stores/authStore';
import { authAPI } from '@/lib/api';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: Globe },
];

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);

  // Profile Form
  const [profile, setProfile] = useState({ name: user?.name, email: user?.email, phone: user?.phone });
  
  // Security Form
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  // 2FA
  const handleToggle2FA = async () => {
    try {
      const { data } = await authAPI.toggle2FA();
      if (data.success) setUser({ ...user, two_factor_enabled: data.data.two_factor_enabled });
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar */}
        <Card className="h-fit p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </Card>

        {/* Content */}
        <div className="space-y-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'profile' && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                      {user?.name?.charAt(0)}
                    </div>
                    <div>
                      <Button variant="outline" size="sm">Change Avatar</Button>
                    </div>
                  </div>
                  <Input label="Full Name" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                  <Input label="Email" value={profile.email} disabled className="opacity-75" />
                  <Input label="Phone" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                  <div className="flex justify-end">
                    <Button variant="glow">Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-semibold">Change Password</h3>
                    <Input label="Current Password" type="password" />
                    <Input label="New Password" type="password" />
                    <Input label="Confirm Password" type="password" />
                    <div className="flex justify-end">
                      <Button variant="outline">Update Password</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">Secure your account with OTP</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={user?.two_factor_enabled} onChange={handleToggle2FA} />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'preferences' && (
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Moon className="h-5 w-5 text-muted-foreground" />
                      <span>Appearance</span>
                    </div>
                    <ThemeToggle />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language</label>
                    <select className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm">
                      <option>English</option>
                      <option>Urdu</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
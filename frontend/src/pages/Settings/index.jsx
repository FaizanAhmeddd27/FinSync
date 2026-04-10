import { useState } from 'react';

import { motion } from 'framer-motion';
import { User, Shield, Globe, Moon, Smartphone, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/common/ThemeToggle';
import useAuthStore from '@/stores/authStore';
import { authAPI, accountAPI } from '@/lib/api';
import { useEffect } from 'react';
import { toast } from 'sonner';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'receive', label: 'Receive Money (QR)', icon: QrCode },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: Globe },
];

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [primaryAccount, setPrimaryAccount] = useState('');
  const [isFetchingAccount, setIsFetchingAccount] = useState(true);

  useEffect(() => {
    // Fetch accounts to get the primary fallback account number for the QR code
    accountAPI.getAll().then(res => {
       if (res.data?.success && res.data?.data?.accounts?.length > 0) {
          const accounts = res.data.data.accounts;
          const defaultAcc = accounts.find(a => a.is_default) || accounts[0];
          setPrimaryAccount(defaultAcc.account_number);
       }
    }).catch(() => {})
      .finally(() => setIsFetchingAccount(false));
  }, []);

  // Profile Form
  const [profile, setProfile] = useState({ name: user?.name, email: user?.email, phone: user?.phone });
  
  // Security Form
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  // 2FA
  const handleToggle2FA = async () => {
    try {
      const { data } = await authAPI.toggle2FA();
      if (data.success) {
        setUser({ ...user, two_factor_enabled: data.data.two_factor_enabled });
        toast.success(`2FA ${data.data.two_factor_enabled ? 'enabled' : 'disabled'} successfully.`);
      }
    } catch {
      toast.error('Failed to toggle 2FA.');
    }
  };

  const downloadQRCode = () => {
    // Always generate and download the fresh dynamic SVG as a PNG
    const svgElement = document.getElementById('personal-qr-code')?.querySelector('svg');
    if (!svgElement) {
       toast.error('Could not find QR code to download.');
       return;
    }
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);
      // Center the 256x256 QR code with some padding (22px on each side)
      ctx.drawImage(img, 22, 22, 256, 256);
      const link = document.createElement('a');
      link.download = `FINSYNC-QR-${user?.name?.replace(/\s+/g, '-').toUpperCase() || 'CODE'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR Code downloaded successfully!');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
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
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary overflow-hidden relative">
                      {user?.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.name} 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={user?.avatar_url ? "hidden absolute inset-0 items-center justify-center" : "flex items-center justify-center h-full w-full"}>
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <input
                        type="file"
                        id="avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('avatar', file);
                            setIsLoading(true);
                            try {
                              const { updateProfile } = useAuthStore.getState();
                              await updateProfile(formData);
                              toast.success('Avatar updated!');
                            } catch {
                              toast.error('Failed to update avatar.');
                            } finally {
                              setIsLoading(false);
                            }
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('avatar-upload').click()}
                        disabled={isLoading}
                      >
                        Change Avatar
                      </Button>
                    </div>
                  </div>
                  <Input
                    label="Full Name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                  <Input label="Email" value={profile.email} disabled className="opacity-75" />
                  <Input
                    label="Phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="glow"
                      isLoading={isLoading}
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const { updateProfile } = useAuthStore.getState();
                          await updateProfile(profile);
                          toast.success('Profile updated successfully!');
                        } catch {
                          toast.error('Failed to update profile.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'receive' && (
              <Card>
                <CardContent className="pt-6 flex flex-col items-center justify-center space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold">Your Personal QR Code</h3>
                    <p className="text-muted-foreground text-sm mt-1">Show this code to receive money instantly</p>
                  </div>
                  
                  <div id="personal-qr-code" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center min-h-[280px]">
                    {isFetchingAccount ? (
                       <p className="text-sm text-muted-foreground animate-pulse">Generating your secure QR code...</p>
                    ) : primaryAccount ? (
                       <QRCodeSVG 
                         value={JSON.stringify({
                           type: 'personal',
                           account: primaryAccount,
                           name: user?.name,
                           bank: 'FINSYNC'
                         })} 
                         size={256} 
                         level="H" 
                         includeMargin={true} 
                       />
                    ) : (
                       <p className="text-sm text-destructive text-center max-w-[200px]">
                          You need to create a bank account first to receive money via QR.
                       </p>
                    )}
                  </div>
                  
                  <div className="text-center text-sm font-medium">
                    <p>{user?.name}</p>
                    <p className="text-muted-foreground font-normal">{user?.email}</p>
                  </div>
                  
                  <Button variant="outline" className="w-full max-w-xs" onClick={downloadQRCode}>
                    Download QR Code
                  </Button>
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
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
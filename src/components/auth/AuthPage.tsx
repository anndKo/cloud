// @ts-nocheck
import { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, ArrowRight, Key, UserPlus, Fingerprint, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  const generateUserId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) id += '-';
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUserId(id);
    setError(null);
  };

  const validateInputs = () => {
    if (!userId.trim()) {
      setError('Vui lòng nhập ID người dùng');
      return false;
    }
    if (userId.replace(/-/g, '').length < 4) {
      setError('ID phải có ít nhất 4 ký tự');
      return false;
    }
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu');
      return false;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateInputs()) return;

    setIsLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(userId, password);
        if (!error) {
          onAuthSuccess();
        }
      } else {
        const { error } = await signUp(userId, password);
        if (!error) {
          onAuthSuccess();
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-primary shadow-glow mb-6">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">SecureChat</h1>
          <p className="text-muted-foreground">Nhắn tin bảo mật đầu cuối</p>
        </div>

        {/* Auth Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Tabs */}
          <div className="flex gap-2 mb-8 p-1 bg-secondary/50 rounded-lg">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                isLogin 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                !isLogin 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đăng ký
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-destructive text-sm animate-fade-in-up">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User ID Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-primary" />
                ID người dùng
              </label>
              <div className="relative">
                <Input
                  value={userId}
                  onChange={(e) => { setUserId(e.target.value.toUpperCase()); setError(null); }}
                  placeholder={isLogin ? "Nhập ID của bạn" : "XXXX-XXXX-XXXX"}
                  className="font-mono tracking-wider pr-24"
                  maxLength={14}
                />
                {!isLogin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateUserId}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/80"
                  >
                    Tạo ngẫu nhiên
                  </Button>
                )}
              </div>
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  ID này sẽ được dùng để người khác tìm và nhắn tin cho bạn
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Mật khẩu
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••••••"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  Mật khẩu phải có ít nhất 6 ký tự
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="glow"
              size="lg"
              className="w-full mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Đang xử lý...
                </div>
              ) : (
                <>
                  {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          {/* Help text */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            {isLogin ? (
              <>Chưa có tài khoản? <button type="button" onClick={() => setIsLogin(false)} className="text-primary hover:underline">Đăng ký ngay</button></>
            ) : (
              <>Đã có tài khoản? <button type="button" onClick={() => setIsLogin(true)} className="text-primary hover:underline">Đăng nhập</button></>
            )}
          </p>
        </div>

        {/* Security features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="p-4 glass rounded-xl">
            <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Mã hóa E2E</p>
          </div>
          <div className="p-4 glass rounded-xl">
            <Shield className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">AES-256</p>
          </div>
          <div className="p-4 glass rounded-xl">
            <UserPlus className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Ẩn danh</p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Bằng việc đăng ký, bạn đồng ý với điều khoản bảo mật của chúng tôi
        </p>
      </div>
    </div>
  );
};

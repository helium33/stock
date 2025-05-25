import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { Glasses, AlertCircle } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import toast from 'react-hot-toast';
import { Store, STORES } from '../../lib/utils';
import useStoreStore from '../../stores/useStoreStore';

interface LoginFormData {
  email: string;
  password: string;
  store: Store;
}

const Login: React.FC = () => {
  const { login, loginWithGoogle, user } = useAuth();
  const { setCurrentStore } = useStoreStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
      store: 'win',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);
      setLoginError(null);
      await login(data.email, data.password);
      setCurrentStore(data.store);
      navigate(from, { replace: true });
      toast.success('Login successful');
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Invalid email or password');
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      setLoginError(null);
      await loginWithGoogle();
      setCurrentStore(getValues('store'));
      navigate(from, { replace: true });
      toast.success('Login successful');
    } catch (error: any) {
      console.error('Google login error:', error);
      setLoginError(error.message || 'Unauthorized email address');
      toast.error(error.message || 'Failed to login with Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    return <Navigate to="/lens" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div className="text-center">
          <div className="flex justify-center">
            <Glasses size={48} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            Optical Store
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>
        
        {loginError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
              <p className="ml-2 text-sm text-red-500 dark:text-red-400">{loginError}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Select
            label="Select Store"
            options={STORES.map(store => ({
              value: store,
              label: store.toUpperCase()
            }))}
            {...register('store', { required: 'Store selection is required' })}
            error={errors.store?.message}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Sign in with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="w-5 h-5"
            />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or use email</span>
            </div>
          </div>
          
          <Input
            label="Email Address"
            type="email"
            autoComplete="email"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: 'Invalid email address',
              }
            })}
            error={errors.email?.message}
          />
          
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register('password', { 
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              }
            })}
            error={errors.password?.message}
          />
          
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in with Email'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
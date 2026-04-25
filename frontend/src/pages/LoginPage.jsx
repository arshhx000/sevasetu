import { useContext, useState } from 'react';
import { AuthContext } from '../App';

function PopoverButton({ children, className = '', selected = false, ...props }) {
  return (
    <div className="inline-flex">
      <button
        {...props}
        className={`${className} ${
          selected
            ? 'shadow-[8px_0_0_rgba(0,0,0,0.10),12px_0_20px_rgba(0,0,0,0.08)]'
            : ''
        }`}
      >
        {children}
      </button>
    </div>
  );
}

const wardOptions = [
  'Ward 1',
  'Ward 2',
  'Ward 3',
  'Ward 4',
  'Ward 5',
  'Ward 6',
  'Ward 7',
  'Ward 8',
  'Ward 9',
  'Ward 10'
];

const departmentOptions = ['Roads', 'Water', 'Sanitation', 'Drainage', 'Electricity', 'Public Health', 'Solid Waste'];
const designationOptions = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Commissioner'];

function getPasswordStrength(password) {
  let score = 0;
  if ((password || '').length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: 'Weak', barClass: 'bg-[#EF4444]', width: '20%' };
  if (score <= 3) return { label: 'Medium', barClass: 'bg-[#F59E0B]', width: '60%' };
  return { label: 'Strong', barClass: 'bg-[#22C55E]', width: '100%' };
}

function InputError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-[#EF4444]">{message}</p>;
}

function FieldLabel({ children }) {
  return <label className="mb-1 block text-xs font-medium text-white/85">{children}</label>;
}

function SocialAuthButtons() {
  const providers = [
    { key: 'google', label: 'Google', icon: 'G' },
    { key: 'apple', label: 'Apple', icon: 'A' },
    { key: 'microsoft', label: 'Microsoft', icon: 'M' }
  ];

  return (
    <div className="mt-4 border-t border-black/50 pt-4">
      <p className="text-center text-xs text-white/90 text-seva-soft">or continue with</p>
      <div className="mt-3 flex items-center justify-center gap-3">
        {providers.map((provider) => (
          <button
            key={provider.key}
            type="button"
            aria-label={`Continue with ${provider.label}`}
            className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white text-sm font-semibold text-seva-ink transition hover:bg-black/[50]"
          >
            {provider.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    role: 'citizen',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ward: '',
    fullName: '',
    employeeId: '',
    officialEmail: '',
    department: '',
    designation: '',
    zoneWardAssigned: '',
    identifier: '',
    password: '',
    confirmPassword: '',
    rememberMe: true,
    termsAccepted: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '', form: '' }));
  };

  const switchRole = (role) => {
    setForm((prev) => ({ ...prev, role }));
    setErrors({});
    if (role === 'admin') {
      setMode('login');
    }
  };

  const canRegister = form.role !== 'admin';

  const handleSubmit = async () => {
    const nextErrors = {};

    if (mode === 'register' && form.role === 'citizen') {
      if (!form.firstName.trim()) nextErrors.firstName = 'First name is required.';
      if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required.';
      if (!form.email.trim()) nextErrors.email = 'Email address is required.';
      if (!form.phone.trim()) nextErrors.phone = 'Phone number is required.';
      if (!form.ward.trim()) nextErrors.ward = 'Ward / area is required.';
      if (!form.password) nextErrors.password = 'Password is required.';
      if (!form.confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.';
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match.';
      }
      if (!form.termsAccepted) nextErrors.termsAccepted = 'You must accept the terms to continue.';
    }

    if (mode === 'register' && form.role === 'officer') {
      if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
      if (!form.employeeId.trim()) nextErrors.employeeId = 'Employee ID is required.';
      if (!form.officialEmail.trim()) nextErrors.officialEmail = 'Official email is required.';
      if (!form.phone.trim()) nextErrors.phone = 'Phone number is required.';
      if (!form.department.trim()) nextErrors.department = 'Department is required.';
      if (!form.designation.trim()) nextErrors.designation = 'Designation is required.';
      if (!form.zoneWardAssigned.trim()) nextErrors.zoneWardAssigned = 'Zone / ward assignment is required.';
      if (!form.password) nextErrors.password = 'Password is required.';
      if (!form.confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.';
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match.';
      }
      if (!form.termsAccepted) nextErrors.termsAccepted = 'You must accept the terms to continue.';
    }

    if (mode === 'login') {
      if (!form.identifier.trim()) nextErrors.identifier = 'User ID, email, or phone is required.';
      if (form.role === 'officer' && !form.department.trim()) nextErrors.department = 'Department is required for officer login.';
      if (!form.password) nextErrors.password = 'Password is required.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      if (mode === 'register') {
        if (form.role === 'citizen') {
          await login(
            {
              role: 'citizen',
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              email: form.email.trim(),
              phone: form.phone.trim(),
              ward: form.ward.trim(),
              password: form.password,
              confirmPassword: form.confirmPassword,
              termsAccepted: form.termsAccepted
            },
            'register'
          );
        } else if (form.role === 'officer') {
          await login(
            {
              role: 'officer',
              fullName: form.fullName.trim(),
              employeeId: form.employeeId.trim(),
              officialEmail: form.officialEmail.trim(),
              phone: form.phone.trim(),
              department: form.department.trim(),
              designation: form.designation.trim(),
              zoneWardAssigned: form.zoneWardAssigned.trim(),
              password: form.password,
              confirmPassword: form.confirmPassword,
              termsAccepted: form.termsAccepted
            },
            'register'
          );
        }
        return;
      }

      await login(
        {
          role: form.role,
          identifier: form.identifier.trim(),
          password: form.password,
          department: form.department.trim(),
          rememberMe: form.rememberMe
        },
        'login'
      );
    } catch (error) {
      setErrors({
        form: error?.response?.data?.message || error.message || 'Request failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(form.password);

  return (
    <div
  className="relative min-h-screen overflow-hidden"
  style={{ backgroundColor: '#020617' }}
>
      <div
        className="pointer-events-none absolute inset-0 scale-105"
        style={{
          backgroundImage: "url('/bgimagelogin.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(10px)'
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 14% 8%, rgba(0,87,255,0.22), transparent 34%), radial-gradient(circle at 82% 18%, rgba(34,197,94,0.18), transparent 30%), radial-gradient(circle at 50% 78%, rgba(0,87,255,0.14), transparent 42%)'
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(15,23,42,0.35) 0.9px, transparent 0.9px)',
          backgroundSize: '18px 18px'
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(15,23,42,0.14) 0px, rgba(15,23,42,0.14) 1px, transparent 1px, transparent 14px)'
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[10]"
        style={{
          backgroundImage:
            'linear-gradient(112deg, rgba(15,23,42,0.22) 1px, transparent 1px), linear-gradient(22deg, rgba(15,23,42,0.16) 1px, transparent 1px)',
          backgroundSize: '120px 120px, 84px 84px'
        }}
      />

      <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8 md:px-6 md:py-12">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-[30px] border border-black/10 bg-white/10 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-[20px] md:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: 'linear-gradient(128deg, rgba(12, 109, 104, 0.86) 0%, rgba(255,255,255,0.15) 34%, transparent 72%)'
            }}
          />
          <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-4">
            <div className="shrink-0">
              <img
                src="/sevasetu-logo.png"
                alt="Sevasetu logo"
                className="h-16 w-auto rounded-2xl border border-black bg-white p-1"
              />
            </div>
            <div className="min-w-0">
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white/100">
  Sevasetu
</h1>

<p className="mt-1 max-w-lg text-sm leading-6 text-white/90">
  Smart Complaint System for Municipalities
</p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="mx-auto w-full max-w-2xl p-4 md:p-6 bg-white/[0.04] border border-white/5 backdrop-blur-xl rounded-2xl">
              <div className="flex flex-wrap items-start gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/90 text-seva-soft">Account Type</p>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {['citizen', 'officer', 'admin'].map((r) => (
                  <PopoverButton
                    key={r}
                    type="button"
                    onClick={() => switchRole(r)}
                    selected={form.role === r}
                    className={`rounded-2xl px-3 py-2 text-sm capitalize transition-all duration-200 ${
                      form.role === r
                        ? 'bg-[#001219] text-white shadow-[0_10px_20px_rgba(0,87,255,0.24)]'
                        : 'border border-white/5 bg-white/5 text-white hover:bg-white/50'
                    } active:scale-95`}
                  >
                    {r}
                  </PopoverButton>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${mode === 'login' ? 'bg-[#9193f6]/100 text-white' : 'text-seva-soft-white'}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  disabled={!canRegister}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${mode === 'register' ? 'bg-[#9193f6]/100 text-white' : 'text-seva-soft-white'} ${!canRegister ? 'cursor-not-allowed opacity-10' : ''}`}
                >
                  Sign Up
                </button>
              </div>

              {mode === 'login' && (
                <div className="mt-5 space-y-3">
                  {form.role === 'citizen' && (
                    <>
                      <div>
                        <FieldLabel>Email or Phone</FieldLabel>
                        <input
                          className={`input ${errors.identifier ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200'  : ''}`}
                          value={form.identifier}
                          onChange={(e) => update('identifier', e.target.value)}
                          placeholder="Enter email or phone"
                        />
                        <InputError message={errors.identifier} />
                      </div>
                    </>
                  )}

                  {form.role === 'officer' && (
                    <>
                      <div>
                        <FieldLabel>Officer ID or Email</FieldLabel>
                        <input
                          className={`input ${errors.identifier ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                          value={form.identifier}
                          onChange={(e) => update('identifier', e.target.value)}
                          placeholder="Enter officer ID or email"
                        />
                        <InputError message={errors.identifier} />
                      </div>
                      <div>
                        <FieldLabel>Department</FieldLabel>
                        <select
                          className={`input ${errors.department ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                          value={form.department}
                          onChange={(e) => update('department', e.target.value)}
                        >
                          <option value="">Select Department</option>
                          {departmentOptions.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <InputError message={errors.department} />
                      </div>
                    </>
                  )}

                  {form.role === 'admin' && (
                    <div>
                      <FieldLabel>User ID</FieldLabel>
                      <input
                        className={`input ${errors.identifier ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                        value={form.identifier}
                        onChange={(e) => update('identifier', e.target.value)}
                        placeholder="Enter user ID"
                      />
                      <InputError message={errors.identifier} />
                    </div>
                  )}

                  <div>
                    <FieldLabel>Password</FieldLabel>
                    <div className="relative">
                    <input
                      className={`input ${errors.password ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/80 hover:text-white"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                    </div>
                    <InputError message={errors.password} />
                  </div>

                  {form.role === 'citizen' && (
                    <div className="flex flex-col gap-3 text-xs text-white/90 text-seva-soft md:flex-row md:items-center md:justify-between">
                      <span>Use your email address or phone number to sign in.</span>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={form.rememberMe} onChange={(e) => update('rememberMe', e.target.checked)} />
                          Remember Me
                        </label>
                        <a className="font-medium text-white/90 hover:underline" href="mailto:support@civic.gov?subject=Forgot%20Password">
                          Forgot Password?
                        </a>
                      </div>
                    </div>
                  )}

                  {errors.form && <p className="text-xs text-rose-600">{errors.form}</p>}
                </div>
              )}

              {mode === 'register' && form.role === 'citizen' && (
                <div className="mt-5 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>First Name</FieldLabel>
                      <input
                        className={`input ${errors.firstName ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                        value={form.firstName}
                        onChange={(e) => update('firstName', e.target.value)}
                        placeholder="Enter first name"
                      />
                      <InputError message={errors.firstName} />
                    </div>
                    <div>
                      <FieldLabel>Last Name</FieldLabel>
                      <input
                        className={`input ${errors.lastName ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                        value={form.lastName}
                        onChange={(e) => update('lastName', e.target.value)}
                        placeholder="Enter last name"
                      />
                      <InputError message={errors.lastName} />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Email Address</FieldLabel>
                    <input
                      className={`input ${errors.email ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="Enter email address"
                    />
                    <InputError message={errors.email} />
                  </div>

                  <div>
                    <FieldLabel>Phone Number</FieldLabel>
                    <input
                      className={`input ${errors.phone ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="Enter phone number"
                    />
                    <InputError message={errors.phone} />
                  </div>

                  <div>
                    <FieldLabel>Ward / Area</FieldLabel>
                    <select
                      className={`input ${errors.ward ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                      value={form.ward}
                      onChange={(e) => update('ward', e.target.value)}
                    >
                      <option value="">Select Ward / Area</option>
                      {wardOptions.map((ward) => (
                        <option key={ward} value={ward}>{ward}</option>
                      ))}
                    </select>
                    <InputError message={errors.ward} />
                  </div>

                  <div>
                    <FieldLabel>Password</FieldLabel>
                    <div className="relative">
                    <input
                      className={`input ${errors.password ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="Create password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/80 hover:text-white"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="h-2 flex-1 rounded-full bg-black/10">
                        <div className={`h-2 rounded-full ${strength.barClass}`} style={{ width: strength.width }} />
                      </div>
                      <span className="text-xs font-medium text-seva-soft">{strength.label}</span>
                    </div>
                    <InputError message={errors.password} />
                  </div>

                  <div>
                    <FieldLabel>Confirm Password</FieldLabel>
                    <div className="relative">
                    <input
                      className={`input ${errors.confirmPassword ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => update('confirmPassword', e.target.value)}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/80 hover:text-white"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                    </div>
                    <InputError message={errors.confirmPassword} />
                  </div>

                  <label className="flex items-start gap-2 text-xs text-seva-soft">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={form.termsAccepted}
                      onChange={(e) => update('termsAccepted', e.target.checked)}
                    />
                    <span>I agree to the Terms and Conditions required to create a citizen account.</span>
                  </label>
                  <InputError message={errors.termsAccepted} />
                  {errors.form && <p className="text-xs text-rose-600">{errors.form}</p>}
                </div>
              )}

              {mode === 'register' && form.role === 'officer' && (
                <div className="mt-5 space-y-3">
                  <div>
                    <FieldLabel>Full Name</FieldLabel>
                    <input
                      className={`input ${errors.fullName ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                      value={form.fullName}
                      onChange={(e) => update('fullName', e.target.value)}
                      placeholder="Enter full name"
                    />
                    <InputError message={errors.fullName} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Employee ID</FieldLabel>
                      <input
                        className={`input ${errors.employeeId ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                        value={form.employeeId}
                        onChange={(e) => update('employeeId', e.target.value)}
                        placeholder="e.g. EMP-0042"
                      />
                      <InputError message={errors.employeeId} />
                    </div>
                    <div>
                      <FieldLabel>Official Email</FieldLabel>
                      <input
                        className={`input ${errors.officialEmail ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                        value={form.officialEmail}
                        onChange={(e) => update('officialEmail', e.target.value)}
                        placeholder="Enter official email"
                      />
                      <InputError message={errors.officialEmail} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Phone Number</FieldLabel>
                      <input
                        className={`input ${errors.phone ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        placeholder="Enter phone number"
                      />
                      <InputError message={errors.phone} />
                    </div>
                    <div>
                      <FieldLabel>Department</FieldLabel>
                      <select
                        className={`input ${errors.department ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                        value={form.department}
                        onChange={(e) => update('department', e.target.value)}
                      >
                        <option value="">Select Department</option>
                        {departmentOptions.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <InputError message={errors.department} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Designation / Rank</FieldLabel>
                      <select
                        className={`input ${errors.designation ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                        value={form.designation}
                        onChange={(e) => update('designation', e.target.value)}
                      >
                        <option value="">Select Designation / Rank</option>
                        {designationOptions.map((designation) => (
                          <option key={designation} value={designation}>{designation}</option>
                        ))}
                      </select>
                      <InputError message={errors.designation} />
                    </div>
                    <div>
                      <FieldLabel>Zone / Ward Assigned</FieldLabel>
                      <select
                        className={`input ${errors.zoneWardAssigned ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                        value={form.zoneWardAssigned}
                        onChange={(e) => update('zoneWardAssigned', e.target.value)}
                      >
                        <option value="">Select Zone / Ward Assigned</option>
                        {wardOptions.map((ward) => (
                          <option key={ward} value={ward}>{ward}</option>
                        ))}
                      </select>
                      <InputError message={errors.zoneWardAssigned} />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Password</FieldLabel>
                    <div className="relative">
                    <input
                      className={`input ${errors.password ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="Create password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/80 hover:text-white"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="h-2 flex-1 rounded-full bg-black/10">
                        <div className={`h-2 rounded-full ${strength.barClass}`} style={{ width: strength.width }} />
                      </div>
                      <span className="text-xs font-medium text-seva-soft">{strength.label}</span>
                    </div>
                    <InputError message={errors.password} />
                  </div>

                  <div>
                    <FieldLabel>Confirm Password</FieldLabel>
                    <div className="relative">
                    <input
                      className={`input ${errors.confirmPassword ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => update('confirmPassword', e.target.value)}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/80 hover:text-white"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                    </div>
                    <InputError message={errors.confirmPassword} />
                  </div>

                  <label className="flex items-start gap-2 text-xs text-seva-soft">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={form.termsAccepted}
                      onChange={(e) => update('termsAccepted', e.target.checked)}
                    />
                    <span>I confirm this information is accurate and I accept the terms for officer registration.</span>
                  </label>
                  <InputError message={errors.termsAccepted} />
                  {errors.form && <p className="text-xs text-rose-600">{errors.form}</p>}
                </div>
              )}

              {mode === 'register' && form.role === 'admin' && (
                <div className="mt-5 rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/15 p-4 text-sm text-[#FDE68A]">
                  Admin accounts are not self-registered. Use the Login form with your assigned User ID and password.
                </div>
              )}

              <PopoverButton
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary mt-5 w-full"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </PopoverButton>

              {mode === 'register' && canRegister && (
                <PopoverButton
                  type="button"
                  onClick={() => setMode('login')}
                  className="btn-secondary mt-3 w-full"
                >
                  Back to Login
                </PopoverButton>
              )}

              <SocialAuthButtons />
            </div>

          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

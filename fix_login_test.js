const fs = require('fs');
const p = 'D:/duong/web/src/__tests__/login.test.tsx';
let c = fs.readFileSync(p, 'utf8');
const start = c.indexOf('function authValue');
if (start >= 0) {
  const end = c.indexOf('\n}\n\nfunction', start);
  if (end >= 0) {
    const rep = `function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    initializing: false,
    user: null,
    profile: null,
    timezone: 'Asia/Ho_Chi_Minh',
    phone: null,
    configured: true,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
    refreshProfile: vi.fn(),
    resendVerification: vi.fn(),
    reloadUser: vi.fn(),
    sendPasswordReset: vi.fn(),
    ...overrides,
  };
}`;
    c = c.slice(0, start) + rep + c.slice(end + 2);
    fs.writeFileSync(p, c, 'utf8');
    console.log('ok');
    process.exit(0);
  }
}
console.log('no');

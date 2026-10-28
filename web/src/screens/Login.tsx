import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { TextField } from '../components/Fields';
import { Segmented } from '../components/Segmented';
import { Text } from '../components/Text';
import { useAuth } from '../store/authContext';
import { isValidAddress, isValidPhone, looksLikePhone } from '../utils/phone';

/** Nội dung giới thiệu ứng dụng */
const FEATURES = [
  {
    icon: '💊',
    title: 'Nhắc đúng giờ, không bỏ sót',
    body: 'Đặt nhiều giờ uống trong ngày theo đơn của bác sĩ. Đơn giản, dùng trên điện thoại và máy tính để theo dõi thuốc và liều lượng.',
  },
  {
    icon: '✅',
    title: 'Chỉ mất một nút để xong',
    body: 'Chữ lớn, phân trang cao, nút to. Khi đến giờ uống thuốc chỉ cần ghi nhận ngay, không cần gõ gì.',
  },
  {
    icon: '⏰',
    title: 'Nhắc lại nếu chưa uống',
    body: 'Nếu chưa xác nhận, ứng dụng sẽ nhắc lại sau ít phút (số phút và số lần do bạn chỉnh trong phần Cài đặt).',
  },
  {
    icon: '👨‍👩‍👦',
    title: 'Người thân cùng theo dõi',
    body: 'Người thân nhập mã 6 chữ số để xem lịch uống thuốc qua mạng. Nếu bạn quên uống, họ sẽ nhận được thông báo để nhắc bạn.',
  },
  {
    icon: '📅',
    title: 'Lịch và lịch sử đầy đủ',
    body: 'Xem lịch từng ngày theo buổi sáng/trưa/chiều/tối, và tra lại lịch sử đã uống hay bỏ lỡ trong quá khứ.',
  },
  {
    icon: '🔒',
    title: 'Riêng tư, an toàn',
    body: 'Chỉ người được bạn cấp quyền mới xem được lịch. Bạn có thể ngắt kết nối bất cứ lúc nào, hiệu lực ngay lập tức.',
  },
];

const BENEFITS = [
  'Không lo quên liều hoặc uống trùng liều',
  'Người thân yên tâm dù xa',
  'Không cần cài ứng dụng: mở bằng trình duyệt là dùng được',
  'Có thể thêm vào màn hình chính điện thoại như một ứng dụng',
];

const STEPS = [
  { icon: '1️⃣', title: 'Tạo tài khoản', body: 'Dùng email hoặc số điện thoại. Có thể khai thêm số điện thoại và địa chỉ để tiện liên hệ.' },
  { icon: '2️⃣', title: 'Thêm thuốc và giờ uống', body: 'Ghi tên thuốc, liều và các giờ uống trong ngày.' },
  { icon: '3️⃣', title: 'Bật thông báo', body: 'Cho phép trình duyệt gửi thông báo để không bỏ lỡ liều nào.' },
];

type AuthMode = 'login' | 'register';

export function Login() {
  const { configured, error, login, register, clearError } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [fieldError, setFieldError] = useState<{
    identifier?: string;
    password?: string;
    phone?: string;
    address?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotId, setForgotId] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  function openAuth(next: AuthMode) {
    setMode(next);
    clearError();
    setFieldError({});
    setAuthOpen(true);
  }

  function closeAuth() {
    setAuthOpen(false);
    clearError();
    setFieldError({});
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    clearError();
    setFieldError({});
  }

  function validateFields(): { identifier?: string; password?: string; phone?: string; address?: string } {
    const errors: { identifier?: string; password?: string; phone?: string; address?: string } = {};
    const value = identifier.trim();

    if (value === '') {
      errors.identifier = mode === 'login' ? 'Nhập email hoặc số điện thoại' : 'Nhập email hoặc số điện thoại';
    } else if (looksLikePhone(value)) {
      if (!isValidPhone(value)) errors.identifier = 'Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)';
    } else if (!/^\S+@\S+\.\S+$/.test(value)) {
      errors.identifier = 'Email không hợp lệ';
    }

    if (password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';

    if (mode === 'register') {
      if (phone.trim() !== '' && !isValidPhone(phone)) {
        errors.phone = 'Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)';
      }
      if (address.trim() !== '' && !isValidAddress(address)) {
        errors.address = 'Địa chỉ tối đa 200 ký tự';
      }
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateFields();
    setFieldError(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const value = identifier.trim();
      if (mode === 'login') {
        await login(value, password);
      } else {
        await register(value, password, {
          phone: phone.trim() === '' ? undefined : phone.trim(),
          address: address.trim() === '' ? undefined : address.trim(),
        });
      }
      navigate('/', { replace: true });
    } catch {
      // lỗi đã lưu trong auth context và hiển thị dưới form
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="landing">
      <header className="site-header">
        <div className="site-header__inner">
          <span className="brand">
            <span className="brand__mark" aria-hidden="true">💊</span>
            <span className="brand__text">Nhắc lịch uống thuốc</span>
          </span>
          <div className="site-header__actions">
            <Button variant="ghost" aria-label="Mở đăng nhập" onClick={() => openAuth('login')}>
              Đăng nhập
            </Button>
            <Button aria-label="Mở đăng ký" onClick={() => openAuth('register')}>
              Đăng ký
            </Button>
          </div>
        </div>
      </header>

      <div className="landing__inner">
        <section className="hero">
          <div className="hero__content">
            <span className="hero__badge">Ứng dụng miễn phí dùng trên trình duyệt</span>
            <h1 className="hero__title">Nhắc lịch uống thuốc cho người cao tuổi</h1>
            <p className="hero__lead">
              Giúp người cao tuổi uống thuốc đúng giờ, đúng liều; đồng thời để người thân theo dõi từ xa và nhận thông báo khi có liều bỏ lỡ.
            </p>
            <div className="hero__actions">
              <Button onClick={() => openAuth('register')}>Bắt đầu — tạo tài khoản</Button>
              <Button variant="secondary" onClick={() => openAuth('login')}>
                Đã có tài khoản
              </Button>
            </div>
          </div>

          <div className="hero__preview" aria-hidden="true">
            <div className="hero__preview-top">
              <span aria-hidden="true">🔔</span> Cần uống bây giờ
            </div>
            <div className="hero__preview-time">07:00</div>
            <div className="hero__preview-name">Amlodipine 5mg</div>
            <div className="hero__preview-row">
              <span aria-hidden="true">🍽️</span> Buổi sáng sau ăn
            </div>
            <div className="hero__preview-row">
              <span aria-hidden="true">✅</span> Đã uống lúc 07:02
            </div>
          </div>
        </section>

        <div className="trust-strip">
          <div className="trust">
            <span className="trust__value">3</span>
            <span className="trust__label">bước để bắt đầu</span>
          </div>
          <div className="trust">
            <span className="trust__value">8</span>
            <span className="trust__label">màn hình dễ dùng</span>
          </div>
          <div className="trust">
            <span className="trust__value">PWA</span>
            <span className="trust__label">thêm vào màn hình chính</span>
          </div>
        </div>

        <section className="section">
          <header className="section__head">
            <p className="section__kicker">Tính năng</p>
            <h2 className="section__title">Được thiết kế cho người cao tuổi</h2>
            <p className="section__desc">Chữ lớn, nút to, ít thao tác, dễ đọc ở mọi cỡ màn hình.</p>
          </header>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="feature-card">
                <span className="feature-card__icon" aria-hidden="true">{f.icon}</span>
                <h3 className="feature-card__title">{f.title}</h3>
                <p className="feature-card__body">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--split">
          <div className="split">
            <div>
              <p className="section__kicker">Lợi ích</p>
              <h2 className="section__title">An tâm hơn cho cả hai thế hệ</h2>
              <ul className="benefit-list">
                {BENEFITS.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <div className="split__actions">
                <Button onClick={() => openAuth('register')}>Tạo tài khoản miễn phí</Button>
              </div>
            </div>
            <div className="steps">
              {STEPS.map((s) => (
                <article key={s.title} className="step-card">
                  <span className="step-card__num" aria-hidden="true">{s.icon}</span>
                  <div>
                    <h3 className="step-card__title">{s.title}</h3>
                    <p className="step-card__body">{s.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="text-center muted" style={{ fontSize: 'calc(15px * var(--font-mult))' }}>
          Ứng dụng nhắc lịch uống thuốc và theo dõi sức khỏe người cao tuổi
        </footer>
      </div>

      {authOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeAuth();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <div className="modal__head">
              <h2 id="auth-title" className="modal__title">
                {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </h2>
              <button type="button" className="modal__close" aria-label="Đóng" onClick={closeAuth}>
                ×
              </button>
            </div>

            {!configured ? (
              <Notice tone="warning" icon="⚠️">
                <Text strong as="span">Chưa cấu hình Firebase.</Text>{' '}
                Điền các biến <code>VITE_FIREBASE_*</code> vào <code>web/.env</code> (xem README) rồi chạy lại.
              </Notice>
            ) : (
              <>
                <Segmented
                  label="Đăng nhập hay tạo tài khoản"
                  value={mode}
                  onChange={switchMode}
                  options={[
                    { value: 'login', label: 'Đăng nhập' },
                    { value: 'register', label: 'Tạo tài khoản' },
                  ]}
                />

                <form onSubmit={handleSubmit} noValidate>
                  <TextField
                    id="auth-identifier"
                    label="Email hoặc số điện thoại"
                    type="text"
                    value={identifier}
                    onChange={(v) => {
                      setIdentifier(v);
                      clearError();
                    }}
                    error={fieldError.identifier}
                    hint={
                      mode === 'login'
                        ? looksLikePhone(identifier)
                          ? 'Đăng nhập bằng số điện thoại'
                          : 'Nhập email hoặc số điện thoại đã dùng'
                        : 'Dùng để đăng nhập sau (email hoặc số điện thoại)'
                    }
                    autoComplete="username"
                    placeholder="ten@vi-du.com hoặc 0912345678"
                    required
                  />
                  <TextField
                    id="auth-password"
                    label="Mật khẩu"
                    type="password"
                    value={password}
                    onChange={(v) => {
                      setPassword(v);
                      clearError();
                    }}
                    error={fieldError.password}
                    hint={mode === 'register' ? 'Tối thiểu 6 ký tự' : undefined}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                  {mode === 'login' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6, marginBottom: 10 }}>
                      <button
                        type="button"
                        onClick={() => { setForgotOpen(true); setForgotId(identifier); setForgotMsg(null); clearError(); }}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--c-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 'calc(15px * var(--font-mult))' }}
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  )}
                  {mode === 'register' && (
                    <>
                      <TextField
                        id="auth-phone"
                        label="Số điện thoại (không bắt buộc)"
                        type="tel"
                        value={phone}
                        onChange={(v) => {
                          setPhone(v);
                          clearError();
                        }}
                        error={fieldError.phone}
                        hint="Dùng để người thân liên hệ và hiển thị trong kết nối gia đình"
                        autoComplete="tel"
                        placeholder="0912345678"
                      />
                      <TextField
                        id="auth-address"
                        label="Địa chỉ (không bắt buộc)"
                        type="text"
                        value={address}
                        onChange={(v) => {
                          setAddress(v);
                          clearError();
                        }}
                        error={fieldError.address}
                        hint="Địa chỉ liên hệ, lưu trong hồ sơ của bạn"
                        autoComplete="street-address"
                        placeholder="12 Lê Lợi, Q.1, TP.HCM"
                      />
                    </>
                  )}
                  {error && (
                    <Notice tone="error" icon={false}>
                      {error}
                    </Notice>
                  )}
                  <Button type="submit" block loading={submitting}>
                    {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                  </Button>
                </form>

                <p className="muted text-center" style={{ marginBottom: 0, fontSize: 'calc(16px * var(--font-mult))' }}>
                  {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--c-primary)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: 'inherit',
                    }}
                  >
                    {mode === 'login' ? 'Tạo tài khoản ngay' : 'Đăng nhập'}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {forgotOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) { setForgotOpen(false); setForgotMsg(null); }
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="forgot-title">
            <div className="modal__head">
              <h2 id="forgot-title" className="modal__title">Khôi phục mật khẩu</h2>
              <button type="button" className="modal__close" aria-label="Đóng" onClick={() => { setForgotOpen(false); setForgotMsg(null); }}>×</button>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>Nhập email hoặc số điện thoại đã dùng để đăng ký.</p>
            <TextField
              id="forgot-id"
              label="Email hoặc số điện thoại"
              type="text"
              value={forgotId}
              onChange={(v) => { setForgotId(v); setForgotMsg(null); clearError(); }}
              autoComplete="username"
              placeholder="ten@vi-du.com hoặc 0912345678"
            />
            {forgotMsg && (
              <Notice tone={forgotMsg.includes('không thể') ? 'warning' : 'success'} icon={false}>
                {forgotMsg}
              </Notice>
            )}
            {error && <Notice tone="error" icon={false}>{error}</Notice>}
            <Button
              type="button"
              block
              loading={forgotSending}
              onClick={async () => {
                setForgotSending(true);
                setForgotMsg(null);
                clearError();
                try {
                  const { sendPasswordReset } = await import('../services/firebase');
                  await sendPasswordReset(forgotId);
                  setForgotMsg('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (cả thư rác/spam).');
                } catch (e) {
                  const msg = (e as Error).message || '';
                  if (msg.includes('không thể')) {
                    setForgotMsg(msg);
                  } else {
                    setForgotMsg('Nếu email/số điện thoại này đã đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');
                  }
                } finally {
                  setForgotSending(false);
                }
              }}
            >
              Gửi email đặt lại mật khẩu
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

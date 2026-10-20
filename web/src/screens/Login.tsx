import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { TextField } from '../components/Fields';
import { Segmented } from '../components/Segmented';
import { Text } from '../components/Text';
import { useAuth } from '../store/authContext';
import { isValidAddress, isValidPhone, looksLikePhone } from '../utils/phone';

/** Nội dung giới thiệu — công dụng, tiện ích và lợi ích của ứng dụng. */
const FEATURES = [
  {
    icon: '⏰',
    title: 'Nhắc đúng giờ, không bỏ sót',
    body: 'Đặt nhiều giờ uống trong ngày theo đơn của bác sĩ. Đến giờ, ứng dụng nhắc trên điện thoại và máy tính — kèm tên thuốc và liều lượng.',
  },
  {
    icon: '✅',
    title: 'Chỉ một nút bấm là xong',
    body: 'Chữ lớn, tương phản cao, nút bấm to. Nhấn “Đã uống thuốc” là ghi nhận ngay, không cần gõ gì.',
  },
  {
    icon: '🔁',
    title: 'Nhắc lại nếu chưa uống',
    body: 'Nếu chưa xác nhận, ứng dụng tự nhắc lại sau ít phút (số phút và số lần do bạn chỉnh trong phần Cài đặt).',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Người thân cùng theo dõi',
    body: 'Người thân nhập mã 6 chữ số để xem lịch uống thuốc qua mạng. Nếu bạn quên uống, họ nhận được thông báo để nhắc bạn.',
  },
  {
    icon: '🗓️',
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
  'Người thân yên tâm dù ở xa',
  'Không cần cài ứng dụng: mở bằng trình duyệt là dùng được',
  'Có thể thêm vào màn hình chính điện thoại như một ứng dụng',
];

const STEPS = [
  { icon: '1️⃣', title: 'Tạo tài khoản', body: 'Dùng email hoặc số điện thoại. Có thể khai thêm số điện thoại và địa chỉ để tiện liên hệ.' },
  { icon: '2️⃣', title: 'Thêm thuốc và giờ uống', body: 'Ghi tên thuốc, liều và các giờ uống trong ngày.' },
  { icon: '3️⃣', title: 'Bật thông báo', body: 'Cho phép trình duyệt gửi thông báo để không bỏ lỡ liều nào.' },
];

type AuthMode = 'login' | 'register';

/**
 * Trang chủ (giới thiệu) của ứng dụng.
 *
 * Là cửa vào của ứng dụng (bước hệ thống trước M01, không nằm trong
 * danh sách màn hình M01–M08 của INTERFACE_SPEC): phần đầu giới thiệu
 * công dụng – tiện ích – lợi ích; khi người dùng bấm “Đăng nhập” hoặc
 * “Đăng ký”, form đăng nhập/đăng ký hiện ra **giữa màn hình** dưới
 * dạng hộp thoại (dialog).
 *
 * Đăng nhập dùng **một ô nhập chung**: gõ email thì đăng nhập bằng email,
 * gõ số điện thoại thì đăng nhập bằng SĐT (SĐT đi qua email nội bộ
 * `<sđt>@med.local` vì Firebase Spark plan không có Phone Auth OTP SMS).
 */
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

  /** Mở hộp thoại đăng nhập/đăng ký ở giữa màn hình. */
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

  /** Kiểm tra đầu vào theo chế độ đang chọn — dùng chung cho cả hai chế độ */
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

    // Chỉ đăng ký mới có SĐT/địa chỉ — không bắt buộc, nhưng nhập thì phải đúng
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
      // lỗi đã lưu trong auth context → hiển thị ở dưới form
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="landing">
      {/* ---------------- Thanh đầu trang ---------------- */}
      <header className="site-header">
        <div className="site-header__inner">
          <span className="brand">
            <span className="brand__mark" aria-hidden="true">
              💊
            </span>
            <span className="brand__text">Nhắc lịch uống thuốc</span>
          </span>
          <div className="site-header__actions">
            <Button variant="ghost" aria-label="Mở đăng nhập" onClick={() => openAuth('login')}>
              Đăng nhập
            </Button>
            <Button aria-label="Mở đăng ký" onClick={() => openAuth('register')}>
              Đăng ký
            </Button>
          </div>        </div>
      </header>

      <div className="landing__inner">
        {/* ---------------- Giới thiệu ---------------- */}
        <section className="hero">
          <div className="hero__content">
            <span className="hero__badge">Ứng dụng miễn phí · dùng trên trình duyệt</span>
            <h1 className="hero__title">Nhắc lịch uống thuốc cho người cao tuổi</h1>
            <p className="hero__lead">
              Giúp người cao tuổi uống thuốc đúng giờ, đúng liều; đồng thời để người thân theo dõi từ xa và
              nhận thông báo khi có liều bị bỏ lỡ.
            </p>
            <div className="hero__actions">
              <Button onClick={() => openAuth('register')}>Bắt đầu — tạo tài khoản</Button>
              <Button variant="secondary" onClick={() => openAuth('login')}>
                Tôi đã có tài khoản
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
              <span aria-hidden="true">🌅</span> Buổi sáng · sau ăn
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
            <span className="trust__value">24/7</span>
            <span className="trust__label">nhắc đúng giờ</span>
          </div>
          <div className="trust">
            <span className="trust__value">0đ</span>
            <span className="trust__label">không mất phí</span>
          </div>
          <div className="trust">
            <span className="trust__value">4</span>
            <span className="trust__label">buổi theo dõi mỗi ngày</span>
          </div>
        </div>

        <section aria-labelledby="cong-dung-title" style={{ marginBottom: 28 }}>
          <h2 id="cong-dung-title" className="section-title" style={{ fontSize: 'calc(24px * var(--font-mult))' }}>
            <span className="section-title__icon" aria-hidden="true">
              🎯
            </span>
            Công dụng và tiện ích
          </h2>
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature" key={feature.title}>
                <span className="feature__icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p className="muted" style={{ margin: 0, fontSize: 'calc(17px * var(--font-mult))' }}>
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="loi-ich-title" style={{ marginBottom: 28 }}>
          <h2 id="loi-ich-title" className="section-title" style={{ fontSize: 'calc(24px * var(--font-mult))' }}>
            <span className="section-title__icon" aria-hidden="true">
              💚
            </span>
            Lợi ích khi sử dụng
          </h2>
          <div className="card">
            <ul className="plain-list" style={{ fontSize: 'calc(18px * var(--font-mult))' }}>
              {BENEFITS.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="cach-dung-title" style={{ marginBottom: 32 }}>
          <h2 id="cach-dung-title" className="section-title" style={{ fontSize: 'calc(24px * var(--font-mult))' }}>
            <span className="section-title__icon" aria-hidden="true">
              🚀
            </span>
            Bắt đầu trong 3 bước
          </h2>
          <div className="feature-grid">
            {STEPS.map((step) => (
              <article className="feature" key={step.title}>
                <span className="feature__icon" aria-hidden="true">
                  {step.icon}
                </span>
                <h3>{step.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer className="text-center muted" style={{ fontSize: 'calc(15px * var(--font-mult))' }}>
          Ứng dụng nhắc lịch uống thuốc và theo dõi sức khỏe người cao tuổi
        </footer>
      </div>

      {/* ---------------- Hộp thoại đăng nhập / đăng ký (giữa màn hình) ---------------- */}
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
                ✕
              </button>
            </div>

            {!configured ? (
              <Notice tone="warning" icon="⚙️">
                <Text strong as="span">
                  Chưa cấu hình Firebase.
                </Text>{' '}
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
                          : 'Nhập email hoặc số điện thoại đều được'
                        : 'Dùng để đăng nhập về sau (email hoặc số điện thoại)'
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
                        hint="Dùng để người thân liên hệ và hiện trong kết nối gia đình"
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
    </div>
  );
}

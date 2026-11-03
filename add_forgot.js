const fs = require('fs');
const p = 'web/src/screens/Login.tsx';
let c = fs.readFileSync(p, 'utf8');
if (c.includes('forgot-open-title')) { console.log('has'); return; }
const modal = `
      {forgotOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) { setForgotOpen(false); setForgotMsg(null); }
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="forgot-open-title">
            <div className="modal__head">
              <h2 id="forgot-open-title" className="modal__title">Khôi phục mật khẩu</h2>
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
                  const msg = (e as Error).message;
                  if (msg && msg.includes('không thể')) {
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
`;
c = c.replace('    </div>\n  );\n}\n', modal + '    </div>\n  );\n}\n');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');

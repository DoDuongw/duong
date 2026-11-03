const fs = require('fs');
const p = 'web/src/screens/Login.tsx';
let c = fs.readFileSync(p, 'utf8');
if (c.includes('Quên mật khẩu')) { console.log('has'); return; }
const marker = "                  />\n                  {mode === 'register' && (";
const link = "                  />\n                  {mode === 'login' && (\n                    <div style={{display:'flex',justifyContent:'flex-end',marginTop:-6,marginBottom:10}}>\n                      <button type=\"button\" onClick={() => { setForgotOpen(true); setForgotId(identifier); setForgotMsg(null); clearError(); }} style={{background:'none',border:'none',padding:0,color:'var(--c-primary)',fontWeight:600,cursor:'pointer',fontSize:'calc(15px * var(--font-mult))'}}>Quên mật khẩu?</button>\n                    </div>\n                  )}\n                  {mode === 'register' && (";
if (c.indexOf(marker) >= 0) {
  c = c.replace(marker, link);
  fs.writeFileSync(p, c, 'utf8');
  console.log('ok');
} else {
  console.log('nf');
}

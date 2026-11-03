const fs = require('fs');
const p = 'web/src/screens/Login.tsx';
let c = fs.readFileSync(p, 'utf8');
if (c.includes('Quên mật khẩu')) { console.log('has'); return; }
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("mode === 'register' && (") && !lines[i-1].includes('Quên')) {
    const indent = lines[i].match(/^\s*/)[0];
    const link = indent + "{mode === 'login' && (\n" + indent + "  <div style={{display:'flex',justifyContent:'flex-end',marginTop:-6,marginBottom:10}}>\n" + indent + "    <button type=\"button\" onClick={() => { setForgotOpen(true); setForgotId(identifier); setForgotMsg(null); clearError(); }} style={{background:'none',border:'none',padding:0,color:'var(--c-primary)',fontWeight:600,cursor:'pointer',fontSize:'calc(15px * var(--font-mult))'}}>Quên mật khẩu?</button>\n" + indent + "  </div>\n" + indent + ")}\n";
    lines.splice(i, 0, link);
    fs.writeFileSync(p, lines.join('\n'), 'utf8');
    console.log('ok');
    return;
  }
}
console.log('nf');

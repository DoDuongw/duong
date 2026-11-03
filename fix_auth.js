const fs = require('fs');
const p = 'web/src/services/firebase.ts';
let c = fs.readFileSync(p, 'utf8');
const old = "export function onAuthChange(\n  callback: (user: { uid: string; email: string; emailVerified: boolean } | null) => void,\n): Unsubscribe {\n  const authInstance = auth;\n  if (!authInstance) {\n    callback(null);\n    return () => undefined;\n  }\n  return onAuthStateChanged(authInstance, (user) => {\n    callback(user ? { uid: user.uid, email: user.email ?? '', emailVerified: user.emailVerified } : null);\n  });\n}";
const neu = "export function onAuthChange(\n  callback: (user: { uid: string; email: string; emailVerified: boolean } | null) => void,\n): Unsubscribe {\n  const authInstance = auth;\n  if (authInstance === null) {\n    callback(null);\n    return () => undefined;\n  }\n  return onAuthStateChanged(authInstance, (user) => {\n    callback(user ? { uid: user.uid, email: user.email ?? '', emailVerified: user.emailVerified } : null);\n  });\n}";
if (c.includes(old)) {
  c = c.replace(old, neu);
  fs.writeFileSync(p, c, 'utf8');
  console.log('ok');
} else {
  console.log('nf');
}

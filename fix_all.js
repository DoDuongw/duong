const fs = require('fs');
const files = ['D:/duong/web/src/__tests__/admin.test.tsx','D:/duong/web/src/__tests__/authProvider.test.tsx','D:/duong/web/src/__tests__/dueReminder.test.tsx','D:/duong/web/src/__tests__/m08Notification.test.tsx'];
files.forEach(p=>{
  try{
    let c = fs.readFileSync(p,'utf8');
    c = c.replace(/user:\s*\{\s*uid:\s*'([^']+)'\s*,\s*email:\s*'([^']+)'\s*\}/g, "user: { uid: '$1', email: '$2', emailVerified: true }");
    c = c.replace(/user:\s*\{\s*uid:\s*"([^"]+)"\s*,\s*email:\s*"([^"]+)"\s*\}/g, "user: { uid: '$1', email: '$2', emailVerified: true }");
    fs.writeFileSync(p,c,'utf8');
  }catch(e){}
});
console.log('ok');

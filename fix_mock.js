const fs = require('fs');
const files = ['D:/duong/web/src/__tests__/dueReminder.test.tsx','D:/duong/web/src/__tests__/m08Notification.test.tsx','D:/duong/web/src/__tests__/m08Settings.test.tsx','D:/duong/web/src/__tests__/screens.test.tsx'];
files.forEach(p=>{
  try{
    let c = fs.readFileSync(p,'utf8');
    if(!c.includes('resendVerification')) {
      c = c.replace(/refreshProfile: vi\.fn\(\),/g, "refreshProfile: vi.fn(),\n    resendVerification: vi.fn(),\n    reloadUser: vi.fn(),\n    sendPasswordReset: vi.fn(),");
      c = c.replace(/clearError: vi\.fn\(\),\n  \};/g, "clearError: vi.fn(),\n    resendVerification: vi.fn(),\n    reloadUser: vi.fn(),\n    sendPasswordReset: vi.fn(),\n  };");
    }
    fs.writeFileSync(p,c,'utf8');
  }catch(e){}
});
console.log('ok');

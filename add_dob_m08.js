const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/screens/M08.tsx','utf8');
c = c.replace("  const [address, setAddress] = useState(profile?.address ?? '');", "  const [address, setAddress] = useState(profile?.address ?? '');\n  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth ?? '');");
fs.writeFileSync('D:/duong/web/src/screens/M08.tsx', c, 'utf8');
console.log('ok');

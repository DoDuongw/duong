const fs = require('fs');
const p = 'web/src/screens/Login.tsx';
let c = fs.readFileSync(p, 'utf8');
if (!c.includes('forgotOpen')) {
  c = c.replace("import { useAuth } from '../store/authContext';\nimport { isValidAddress, isValidPhone, looksLikePhone } from '../utils/phone';",
    "import { useAuth } from '../store/authContext';\nimport { isValidAddress, isValidPhone, looksLikePhone } from '../utils/phone';\nimport { isInternalMedEmail, toFirebaseEmail } from '../services/firebase';");
  // easier: just append state
  c = c.replace("  const [submitting, setSubmitting] = useState(false);",
    "  const [submitting, setSubmitting] = useState(false);\n  const [forgotOpen, setForgotOpen] = useState(false);\n  const [forgotId, setForgotId] = useState('');\n  const [forgotSending, setForgotSending] = useState(false);\n  const [forgotMsg, setForgotMsg] = useState<string | null>(null);");
  fs.writeFileSync(p, c, 'utf8');
  console.log('ok');
} else {
  console.log('has');
}

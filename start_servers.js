const { spawn } = require('child_process');
const path = require('path');

function start(name, cwd) {
  const p = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev'], {
    cwd,
    detached: true,
    stdio: 'ignore',
    shell: false
  });
  p.unref();
  console.log('started', name);
}

start('backend', path.join(__dirname, 'backend'));
start('web', path.join(__dirname, 'web'));
console.log('done');
setTimeout(() => process.exit(0), 1000);

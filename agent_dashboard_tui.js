// /cli/agent-dashboard-tui.js
import blessed from 'blessed';
import fetch from 'node-fetch';
import { exec } from 'child_process';

const screen = blessed.screen({ smartCSR: true });
screen.title = 'AI Agent TUI Dashboard';

const list = blessed.list({
  top: 0,
  left: 0,
  width: '30%',
  height: '100%',
  label: 'Agents',
  border: 'line',
  style: {
    selected: { bg: 'blue' },
    border: { fg: 'cyan' }
  },
  keys: true,
  vi: true
});

const box = blessed.box({
  top: 0,
  left: '30%',
  width: '35%',
  height: '100%',
  label: 'Details',
  border: 'line',
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' ',
    inverse: true
  },
  style: {
    border: { fg: 'green' },
    scrollbar: { bg: 'green' }
  }
});

const logBox = blessed.box({
  top: 0,
  left: '65%',
  width: '35%',
  height: '50%',
  label: 'Live Log',
  border: 'line',
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' ',
    inverse: true
  },
  style: {
    border: { fg: 'yellow' },
    scrollbar: { bg: 'yellow' }
  }
});

const diffBox = blessed.box({
  top: '50%',
  left: '65%',
  width: '35%',
  height: '50%',
  label: 'Last Git Diff',
  border: 'line',
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' ',
    inverse: true
  },
  style: {
    border: { fg: 'magenta' },
    scrollbar: { bg: 'magenta' }
  }
});

screen.append(list);
screen.append(box);
screen.append(logBox);
screen.append(diffBox);
list.focus();

let agentItems = [];
function updateDetails(agent) {
  box.setContent(
    `Agent: ${agent.name}\nRuns: ${agent.runs}\nAvg Tokens: ${agent.tokens}\n\nLast Insight:\n${agent.summary}`
  );
  screen.render();
}

function appendLog(text) {
  logBox.setContent((logBox.getContent() + '\n' + text).split('\n').slice(-20).join('\n'));
  screen.render();
}

function updateGitDiff() {
  exec('git diff --stat HEAD~1 HEAD', (err, stdout) => {
    if (err) return;
    diffBox.setContent(stdout.trim());
    screen.render();
  });
}

async function fetchStats() {
  const res = await fetch('http://localhost:3000/api/agent-stats');
  const stats = await res.json();
  agentItems = Object.entries(stats).map(([type, s]) => ({
    name: type.toUpperCase(),
    ...s
  }));
  list.setItems(agentItems.map((a) => a.name));
  list.on('select', (item, i) => updateDetails(agentItems[i]));
  updateDetails(agentItems[0]);
  screen.render();
}

function runSlashCommand(agent, command) {
  const cmd = `echo "/${command}" | node cli/agent-runner.js ${agent.name.toLowerCase()}`;
  exec(cmd, (err, stdout, stderr) => {
    if (err) return appendLog(`❌ ${command} failed.`);
    appendLog(`✅ ${command}: ${stdout.trim()}`);
    updateGitDiff();
  });
}

screen.key(['r'], () => {
  const agent = agentItems[list.selected];
  runSlashCommand(agent, 'run');
});

screen.key(['s'], () => {
  const agent = agentItems[list.selected];
  runSlashCommand(agent, 'status');
});

screen.key(['a'], () => {
  const agent = agentItems[list.selected];
  runSlashCommand(agent, 'security-audit');
});

screen.key(['v'], () => {
  const agent = agentItems[list.selected];
  runSlashCommand(agent, 'review');
});

screen.key(['m'], () => {
  exec('cat .claude/codebase.md', (err, stdout) => {
    if (!err) diffBox.setContent(stdout.trim());
    screen.render();
  });
});

setInterval(() => fetchStats(), 10000);
fetchStats();
updateGitDiff();
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
// ✅ Agent Log System, Hotfix Mode, Notion+Supabase Sync, Voice+Slack Control, Dashboard, Retry Logic, Auto-Scaling

import fs from 'fs';
import { Client as NotionClient } from '@notionhq/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { WebClient as SlackClient } from '@slack/web-api';
import { exec } from 'child_process';
import Redis from 'ioredis';

const notion = new NotionClient({ auth: process.env.NOTION_KEY });
const supabase = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const slack = new SlackClient(process.env.SLACK_TOKEN);
const redis = new Redis(process.env.REDIS_URL);

let memoryData = {};

export const logAgentActivity = (task, status, result) => {
  const timestamp = new Date().toISOString();
  const logLine = `\n[${timestamp}] ${task.agent.toUpperCase()} ${task.task} on ${task.file} — ${status}\nResult: ${result?.summary || 'N/A'}\nTokens Used: ${result?.tokens || 'N/A'}\n`;
  fs.appendFileSync('.task.log', logLine);
  fs.appendFileSync('.agent.history.md', `\n## ${timestamp}\n### ${task.agent}: ${task.task} → ${task.file}\n- **Status:** ${status}\n- **Tokens:** ${result?.tokens || 'N/A'}\n- **Cost:** ${result?.cost || '$0.000'}\n- **Summary:** ${result?.summary || 'N/A'}\n---\n`);
};

export const hotfixAgent = async (task) => {
  try {
    const patch = await callLLM({ model: task.model, messages: [
      { role: 'system', content: 'You are a hotfix-only dev assistant.' },
      { role: 'user', content: `Fix ${task.file}: ${task.prompt}` }
    ]});
    fs.writeFileSync(task.file, patch.code);
    logAgentActivity(task, 'hotfix-applied', patch);
  } catch (err) {
    logAgentActivity(task, 'hotfix-failed', { summary: err.message });
  }
};

export const updateNotionStatus = async (task, result) => {
  await notion.pages.create({
    parent: { database_id: process.env.NOTION_DB_ID },
    properties: {
      Name: { title: [{ text: { content: `${task.agent} | ${task.task}` } }] },
      File: { rich_text: [{ text: { content: task.file } }] },
      Tokens: { number: result.tokens || 0 },
      Status: { select: { name: result.status || 'Pending' } },
      Summary: { rich_text: [{ text: { content: result.summary || '' } }] }
    }
  });
};

export const syncToSupabase = async (task, result) => {
  await supabase.from('agent_logs').insert({
    ...task,
    ...result,
    created_at: new Date().toISOString()
  });
};

export const summarizeDailyLogs = () => {
  const logs = fs.readFileSync('.agent.history.md', 'utf-8');
  const today = new Date().toISOString().split('T')[0];
  const summary = logs.split('\n').filter(l => l.includes(today)).join('\n');
  fs.writeFileSync(`.daily_summaries/${today}.md`, summary);
};

export const syncMemoryToAgents = () => {
  memoryData = JSON.parse(fs.readFileSync('./.agent.memory.json', 'utf-8'));
  return memoryData;
};

export const controlViaSlack = async (text) => {
  return slack.chat.postMessage({
    channel: process.env.SLACK_CHANNEL,
    text: `🧠 Command: ${text}`
  });
};

export const transcribeVoice = async (audioPath) => {
  const transcript = await runWhisper(audioPath);
  if (transcript.includes('/hotfix')) hotfixAgent(parseTaskFromTranscript(transcript));
  return transcript;
};

export const exportLogsToPDF = () => {
  exec('pandoc .agent.history.md -o ./reports/agent-summary.pdf', (err, _, stderr) => {
    if (err) console.error('PDF error:', stderr);
  });
};

export const monitorQueueAndAutoScale = () => {
  setInterval(async () => {
    const queueLength = await redis.llen('task_queue');
    if (queueLength > 10) {
      exec('docker-compose up -d --scale agent_claude=5');
    }
  }, 30000);
};

export const retryFailedTasks = async () => {
  const failed = await redis.lrange('failed_tasks', 0, -1);
  for (const f of failed) {
    const task = JSON.parse(f);
    try {
      await assignAgentTask(task);
      await redis.lrem('failed_tasks', 1, f);
    } catch (err) {
      logAgentActivity(task, 'retry-failed', { summary: err.message });
    }
  }
};

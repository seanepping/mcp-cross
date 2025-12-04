#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'memory');
const DATA_FILE = path.join(DATA_DIR, 'ghostis-brain.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return {
      current_focus: null,
      focus_history: [],
      memories: []
    };
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      current_focus: parsed.current_focus || null,
      focus_history: Array.isArray(parsed.focus_history) ? parsed.focus_history : [],
      memories: Array.isArray(parsed.memories) ? parsed.memories : []
    };
  } catch (err) {
    console.error('Failed to read ghostis-brain data:', err.message);
    process.exit(1);
  }
}

function saveData(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function ensureArgs(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function formatOutput(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function handleGetCurrentContext() {
  const data = loadData();
  formatOutput({
    current_focus: data.current_focus,
    focus_history: data.focus_history.slice(-10),
    total_focus_changes: data.focus_history.length,
    total_memories: data.memories.length,
    last_memory: data.memories.length ? data.memories[data.memories.length - 1] : null
  });
}

function handleSetFocus(args) {
  ensureArgs(args.length, 'Usage: set_focus <focus text>');
  const focus = args.join(' ').trim();
  ensureArgs(focus.length, 'Focus text cannot be empty');
  const data = loadData();
  const entry = {
    focus,
    timestamp: new Date().toISOString()
  };
  data.current_focus = focus;
  data.focus_history.push(entry);
  saveData(data);
  formatOutput({ status: 'ok', focus, timestamp: entry.timestamp });
}

function handleRecallMemory(args) {
  const query = args.join(' ').trim().toLowerCase();
  const data = loadData();
  const matches = data.memories.filter((memory) => {
    if (!query) {
      return true;
    }
    const haystack = JSON.stringify(memory).toLowerCase();
    return haystack.includes(query);
  }).slice(-5);
  formatOutput({
    query: query || null,
    match_count: matches.length,
    matches
  });
}

function handleRememberThis(args) {
  ensureArgs(args.length, 'Usage: remember_this <content> [contextJson]');
  const [contentArg, ...contextParts] = args;
  const content = contentArg.trim();
  ensureArgs(content.length, 'Content cannot be empty');
  let context = {};
  if (contextParts.length) {
    const contextStr = contextParts.join(' ');
    try {
      context = JSON.parse(contextStr);
    } catch (err) {
      console.error('Failed to parse context JSON:', err.message);
      process.exit(1);
    }
  }
  const data = loadData();
  const entry = {
    id: crypto.randomUUID(),
    content,
    context,
    timestamp: new Date().toISOString()
  };
  data.memories.push(entry);
  saveData(data);
  formatOutput({ status: 'ok', memory: entry });
}

function showHelp() {
  console.log(`Usage: ghostis-brain <command> [args]\n\nCommands:\n  get_current_context\n  set_focus <focus text>\n  recall_memory [query]\n  remember_this <content> [contextJson]\n`);
}

function main() {
  const [, , command, ...args] = process.argv;
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(command ? 0 : 1);
  }
  switch (command) {
    case 'get_current_context':
      handleGetCurrentContext();
      break;
    case 'set_focus':
      handleSetFocus(args);
      break;
    case 'recall_memory':
      handleRecallMemory(args);
      break;
    case 'remember_this':
      handleRememberThis(args);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();

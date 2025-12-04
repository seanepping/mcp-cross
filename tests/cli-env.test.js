#!/usr/bin/env node

'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');

const cliPath = path.resolve(__dirname, '..', 'index.js');

function run(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    return true;
  } catch (err) {
    console.error(`✗ ${description}`);
    console.error(`  ${err.message}`);
    return false;
  }
}

let passed = 0;
let failed = 0;

function test(description, fn) {
  if (run(description, fn)) {
    passed++;
  } else {
    failed++;
  }
}

test('CLI propagates --env variables to child process', () => {
  const childScript = 'process.stdout.write(process.env.TEST_ENV || "")';
  const result = spawnSync(process.execPath, [
    cliPath,
    '--env', 'TEST_ENV=from_cli',
    '--',
    process.execPath,
    '-e', childScript
  ], {
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`CLI exited with code ${result.status}, stderr: ${result.stderr}`);
  }

  assert.strictEqual(result.stdout.trim(), 'from_cli');
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);

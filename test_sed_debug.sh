#!/bin/zsh
TEST_PATH="/usr/bin:/mnt/c/Windows/System32:/usr/local/bin:/mnt/d/Projects/node_modules/.bin:/bin"
CMD="export PATH=$(echo \"$TEST_PATH\" | sed -E 's|/mnt/[a-z]/[^:]*:?||g'); echo \"Filtered PATH: $PATH\""
echo "Command: $CMD"
zsh -c "$CMD"

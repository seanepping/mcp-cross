#!/bin/zsh

# Simulate a PATH with Windows paths
TEST_PATH="/usr/bin:/mnt/c/Windows/System32:/usr/local/bin:/mnt/d/Projects/node_modules/.bin:/bin"

echo "Original PATH: $TEST_PATH"

# The command we want to use in JS:
# "export PATH=$(echo \"$PATH\" | sed -E 's|/mnt/[a-z]/[^:]*:?||g')"

# Simulating what zsh -c receives:
echo "\n--- Testing sed filter ---"
zsh -c "export PATH=$(echo \"\" | sed -E 's|/mnt/[a-z]/[^:]*:?||g'); echo \"Filtered PATH: $PATH\""


#!/bin/zsh
echo "--- Test 1: Single Backslash ---"
zsh -c "perl -e 'print \"$ENV{PATH}\n\"'"

echo "--- Test 2: Double Backslash ---"
zsh -c "perl -e 'print \"\$ENV{PATH}\n\"'"

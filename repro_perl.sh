#!/bin/zsh

echo "--- Attempt 1: Single Backslash (Simulating current code) ---"
# In JS: "\$ENV" -> Shell sees: $ENV -> Expanded to empty? No.
# Wait, in the script:
# $ENV -> Shell 1 sees . Shell 2 sees empty.
zsh -c "export PATH=$(perl -e 'print join(\":\", grep { !m{^/mnt/[a-z]/} } split(\":\", $ENV{PATH}))'); echo \"PATH is: $PATH\""

echo "\n--- Attempt 2: Double Backslash (Simulating fix) ---"
# \\$ENV -> Shell 1 sees \$ENV. Shell 2 sees $ENV. Perl sees $ENV.
zsh -c "export PATH=$(perl -e 'print join(\":\", grep { !m{^/mnt/[a-z]/} } split(\":\", \$ENV{PATH}))'); echo \"PATH is: $PATH\""

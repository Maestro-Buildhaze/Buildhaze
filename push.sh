#!/bin/bash
cd /Users/emirg/CascadeProjects/cms-platform
echo "=== GIT STATUS ===" > /tmp/push.log
git status >> /tmp/push.log 2>&1
echo "" >> /tmp/push.log
echo "=== GIT ADD ===" >> /tmp/push.log
git add -A >> /tmp/push.log 2>&1
echo "" >> /tmp/push.log
echo "=== GIT COMMIT ===" >> /tmp/push.log
git commit -m "feat: advanced CMS with template schema" >> /tmp/push.log 2>&1
echo "" >> /tmp/push.log
echo "=== GIT PUSH ===" >> /tmp/push.log
git push origin main >> /tmp/push.log 2>&1
echo "" >> /tmp/push.log
echo "=== DONE ===" >> /tmp/push.log
cat /tmp/push.log

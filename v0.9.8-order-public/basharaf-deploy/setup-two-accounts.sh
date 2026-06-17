#!/bin/zsh
# ─────────────────────────────────────────────────────────────
# راه‌اندازی یک‌باره‌ی دو اکانت Claude Code برای پروژه «با شرف»
# اجرا:  zsh setup-two-accounts.sh
# بعد از اجرا:  «basharaf1» = اکانت ۱ (علی)  /  «basharaf2» = اکانت ۲ (همکار)
# ─────────────────────────────────────────────────────────────

PROJECT_DIR="$HOME/Documents/basharaf-app"

# پرامپت شروع جلسه (هر دو اکانت یکی است — پروتکل کامل در CLAUDE.md است)
START_PROMPT='شروع جلسه طبق پروتکل CLAUDE.md: اول HANDOFF.md (بخش ۰ + جدیدترین ورودی ژورنال) را بخوان، بعد git status و git log -5 --oneline را چک کن و با ژورنال تطبیق بده. سپس به فارسی خلاصه بگو: وضعیت فعلی، کار نیمه‌تمام اگر هست، و کار بعدی پیشنهادی از Backlog — و منتظر تأیید من بمان.'

# پاک‌کردن نسخه‌های قبلی این aliasها (تا تکراری نشوند)
sed -i '' '/alias basharaf1=/d; /alias basharaf2=/d' ~/.zshrc 2>/dev/null

cat >> ~/.zshrc << EOF

# ── با شرف: دو اکانت Claude Code (رله) ──
alias basharaf1='cd "$PROJECT_DIR" && CLAUDE_CONFIG_DIR=~/.claude-account1 claude "$START_PROMPT"'
alias basharaf2='cd "$PROJECT_DIR" && CLAUDE_CONFIG_DIR=~/.claude-account2 claude "$START_PROMPT"'
EOF

source ~/.zshrc
echo ""
echo "✅ تمام شد. از این به بعد:"
echo "   اکانت ۱ (علی):    basharaf1"
echo "   اکانت ۲ (همکار):  basharaf2"
echo ""
echo "⛔ یادآوری: هرگز هر دو را هم‌زمان باز نکنید — نوبتی، بعد از push جلسه‌ی قبلی."

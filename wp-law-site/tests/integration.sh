#!/usr/bin/env bash
# Integration checks against a disposable WordPress install (never run on production).
#
# Usage: tests/integration.sh <wordpress-path> <site-url>
# Needs: wp-cli, curl. The theme "dadvar" and plugin "dadvar-core" must be installed,
# sample content imported (wp dadvar demo import --user=<admin>).
set -u
WP_PATH="$1"
URL="$2"
PASS=0
FAIL=0
wp() { command wp --path="$WP_PATH" --allow-root "$@" 2>/dev/null; }
check() { if [ "$2" = "0" ]; then echo "PASS  $1"; PASS=$((PASS+1)); else echo "FAIL  $1 ${3:-}"; FAIL=$((FAIL+1)); fi; }
code() { curl -s -o /dev/null -w "%{http_code}" "$1"; }
token_old() { wp eval 'echo Dadvar_Core_Form::token(time()-10);'; }
post_form() { curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/wp-json/dadvar/v1/inquiry" "$@"; }
count_inquiries() { wp eval 'echo count(get_posts(["post_type"=>"dadvar_inquiry","post_status"=>"any","numberposts"=>-1]));'; }

ORIG_THEME=$(wp theme list --status=active --field=name)
SERVICES_BEFORE=$(wp post list --post_type=dadvar_service --format=count)
PHONE_BEFORE=$(wp eval 'echo dadvar_office("phone");')

echo "== Public pages =="
for p in / /services/ /services/family/ /about/ /contact/ /articles/ /privacy/ /legal-notice/ "/?s=test" /wp-sitemap.xml; do
	c=$(code "$URL$p"); [ "$c" = "200" ]; check "GET $p -> 200" $? "got $c"
done
c=$(code "$URL/no-such-page-xyz/"); [ "$c" = "404" ]; check "unknown URL -> 404" $? "got $c"

echo "== Private data is not public =="
c=$(code "$URL/wp-json/wp/v2/dadvar_inquiry"); [ "$c" = "404" ]; check "inquiries not in REST" $? "got $c"
curl -s "$URL/?post_type=dadvar_inquiry" | grep -q "_dadvar_phone\|dv-inquiry"; [ $? -ne 0 ]; check "inquiries not queryable on front end" $?
c=$(curl -s -o /dev/null -w "%{http_code}" -X POST -d "action=dadvar_demo_import" "$URL/wp-admin/admin-post.php"); [ "$c" != "302" ] || curl -s -X POST -d "action=dadvar_demo_import" "$URL/wp-admin/admin-post.php" -o /dev/null -w "%{redirect_url}" | grep -q "wp-login"; check "anonymous demo import refused" $? "got $c"

echo "== Form server-side rules =="
wp transient delete --all >/dev/null
N0=$(count_inquiries)
c=$(post_form -F dv_name=a -F dv_phone=123 -F dv_consent=1 -F "dv_token=$(token_old)"); [ "$c" = "422" ]; check "invalid input -> 422" $? "got $c"
c=$(post_form -F dv_name=ربات -F dv_phone=09120000001 -F "dv_topic=سایر موضوعات" -F dv_consent=1 -F dv_website=spam -F "dv_token=$(token_old)"); N1=$(count_inquiries); [ "$c" = "200" ] && [ "$N1" = "$N0" ]; check "honeypot: fake success, nothing stored" $?
c=$(post_form -F dv_name=تست -F dv_phone=09120000002 -F "dv_topic=سایر موضوعات" -F dv_consent=1 -F "dv_token=$(wp eval 'echo Dadvar_Core_Form::token();')"); [ "$c" = "422" ]; check "instant submit (bot speed) refused" $? "got $c"
c=$(post_form -F dv_name=تست -F dv_phone=09120000003 -F "dv_topic=سایر موضوعات" -F dv_consent=1 -F "dv_token=123.forged"); [ "$c" = "422" ]; check "forged token refused" $? "got $c"
c=$(post_form -F dv_name=تست -F dv_phone=09120000004 -F "dv_topic=موضوع ساختگی" -F dv_consent=1 -F "dv_token=$(token_old)"); [ "$c" = "422" ]; check "unknown topic refused" $? "got $c"
for i in 1 2 3 4 5; do post_form -F "dv_name=آزمون $i" -F "dv_phone=0912000010$i" -F "dv_topic=سایر موضوعات" -F dv_consent=1 -F "dv_token=$(token_old)" >/dev/null; done
c=$(post_form -F dv_name=آزمون6 -F dv_phone=09120000106 -F "dv_topic=سایر موضوعات" -F dv_consent=1 -F "dv_token=$(token_old)"); [ "$c" = "429" ]; check "rate limit after 5 requests/hour -> 429" $? "got $c"
wp transient delete --all >/dev/null

echo "== Retention and privacy tools =="
OLD=$(wp eval '$id = Dadvar_Core_Inquiries::create(["name"=>"قدیمی","phone"=>"09120000999","email"=>"old@example.test","topic"=>"سایر موضوعات","time"=>"","message"=>"","source"=>"/"]); wp_update_post(["ID"=>$id,"post_date"=>"2020-01-01 10:00:00","post_date_gmt"=>"2020-01-01 06:30:00"]); echo $id;')
wp eval 'Dadvar_Core_Inquiries::purge_expired();' >/dev/null
S=$(wp eval "echo get_post_status($OLD) ? 'exists' : 'gone';"); [ "$S" = "gone" ]; check "requests older than retention are deleted" $?
NEW=$(wp eval 'echo Dadvar_Core_Inquiries::create(["name"=>"حریم","phone"=>"09120000998","email"=>"privacy@example.test","topic"=>"سایر موضوعات","time"=>"","message"=>"x","source"=>"/"]);')
E=$(wp eval '$r = Dadvar_Core_Inquiries::export_personal_data("privacy@example.test"); echo count($r["data"]);'); [ "$E" = "1" ]; check "personal data exporter finds request" $?
wp eval 'Dadvar_Core_Inquiries::erase_personal_data("privacy@example.test");' >/dev/null
S=$(wp eval "echo get_post_status($NEW) ? 'exists' : 'gone';"); [ "$S" = "gone" ]; check "personal data eraser deletes request" $?

echo "== Sample content safety =="
SID=$(wp eval 'echo Dadvar_Core_Demo_Content::find("service_claims");')
wp post update "$SID" --post_excerpt="متن ویرایش‌شده توسط مدیر" >/dev/null
OUT=$(wp dadvar demo import --user=1); echo "$OUT" | grep -q "^Created: *$"; check "re-import creates nothing (no duplicates)" $?
EX=$(wp post get "$SID" --field=post_excerpt); [ "$EX" = "متن ویرایش‌شده توسط مدیر" ]; check "re-import does not overwrite edited content" $?

echo "== Theme switch keeps data =="
wp theme activate twentytwentyfive >/dev/null
c=$(code "$URL/services/family/"); [ "$c" = "200" ]; check "service page works under another theme" $? "got $c"
N=$(wp post list --post_type=dadvar_service --format=count); [ "$N" = "$SERVICES_BEFORE" ]; check "services preserved after theme switch" $?
P=$(wp eval 'echo dadvar_office("phone");'); [ "$P" = "$PHONE_BEFORE" ]; check "office settings preserved after theme switch" $?
wp theme activate dadvar-child >/dev/null
curl -s "$URL/" | grep -q "dadvar-child-css"; check "child theme loads its stylesheet" $?
c=$(code "$URL/"); [ "$c" = "200" ]; check "child theme home -> 200" $?
wp theme activate "$ORIG_THEME" >/dev/null

echo "== Theme without companion plugin =="
wp plugin deactivate dadvar-core >/dev/null
for p in / /about/ /articles/ /checklist/; do c=$(code "$URL$p"); [ "$c" = "200" ]; check "plugin off: GET $p -> 200" $? "got $c"; done
curl -s "$URL/" | grep -qi "fatal error"; [ $? -ne 0 ]; check "plugin off: no fatal error" $?
wp plugin activate dadvar-core >/dev/null
N=$(wp post list --post_type=dadvar_service --format=count); [ "$N" = "$SERVICES_BEFORE" ]; check "services intact after plugin off/on" $?

echo "== Migrations are repeatable =="
wp option update dadvar_core_schema 0 >/dev/null
wp dadvar migrate >/dev/null; wp dadvar migrate >/dev/null
V=$(wp option get dadvar_core_schema); [ "$V" = "1" ]; check "migration reaches current version twice without error" $?
P=$(wp eval 'echo dadvar_office("phone");'); [ "$P" = "$PHONE_BEFORE" ]; check "migration keeps settings" $?

echo
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ]

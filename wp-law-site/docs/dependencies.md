# وابستگی‌ها، نسخه‌ها و مجوزها

## داخل بسته‌های تحویلی
| مورد | نسخه | مجوز | محل | دلیل |
|---|---|---|---|---|
| قالب Dadvar | 1.0.0 | GPL-2.0-or-later | `themes/dadvar` | کد این پروژه |
| قالب Dadvar Child | 1.0.0 | GPL-2.0-or-later | `themes/dadvar-child` | شخصی‌سازی کدی امن |
| افزونهٔ Dadvar Core | 1.0.0 | GPL-2.0-or-later | `plugins/dadvar-core` | کد این پروژه |
| فونت Vazirmatn (Regular، Bold) | 33.0.3 | SIL Open Font License 1.1 (متن مجوز: `themes/dadvar/assets/fonts/OFL.txt`) | `themes/dadvar/assets/fonts` | فونت فارسی خوانا با مجوز آزاد؛ از بستهٔ npm رسمی `vazirmatn` |
| آیکون‌ها | — | کد خود پروژه (مسیرهای SVG ساده) | `class-components.php`، `site-header.php` | بدون فونت آیکون یا کتابخانهٔ خارجی |
| تصویر جایگزین وکیل | — | توسط افزونه با GD تولید می‌شود (بدون عکس استوک) | — | بدون مسئلهٔ مجوز تصویر |

هیچ کتابخانهٔ JavaScript یا CSS شخص ثالثی (jQuery، Bootstrap، …) در قالب یا افزونه استفاده نشده است.

## نرم‌افزارهای لازم در سایت (جدا نصب می‌شوند)
| مورد | نسخهٔ آزمایش/هدف | مجوز | هزینه |
|---|---|---|---|
| WordPress | 7.1.2 (حداقل 6.7) | GPL-2.0-or-later | رایگان |
| Elementor | 4.0.8 (کد بررسی شد؛ اجرای واقعی در این محیط انجام **نشد** — PROJECT_STATUS.md) | GPL-3.0 | رایگان |
| Elementor Pro (اختیاری) | — | تجاری | پولی (سالانه) — فقط برای Theme Builder |
| PHP | 8.3.6 آزمایش شد (حداقل 7.4، توصیه ≥ 8.2) | — | — |

## ابزارهای توسعه و آزمون (داخل بسته‌ها نیستند)
| ابزار | نسخه | کاربرد |
|---|---|---|
| WP-CLI | 2.12.0 | نصب، ورود نمونه، آزمون یکپارچه |
| PHP_CodeSniffer + WordPress Coding Standards | WPCS 3.x | بررسی استاندارد کد (`phpcs.xml.dist`) |
| PHPCompatibilityWP | آخرین | سازگاری با PHP 7.4+ |
| Playwright + Chromium | 1.56.1 | آزمون مرورگر و تصاویر |
| axe-core | 4.14.0 | آزمون خودکار دسترس‌پذیری WCAG 2.2 AA |
| Lighthouse | 12.8.2 | اندازه‌گیری آزمایشگاهی سرعت |
| MariaDB | 10.11.14 | پایگاه دادهٔ محیط آزمون |

<?php
/**
 * Customizer: presentation-only options (header button, footer text).
 * Contact data is NOT here — it lives in «دفتر وکالت ← اطلاعات دفتر» (single source).
 * Colors and fonts are NOT here — they live in Elementor → Site Settings (single source).
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers Customizer options.
 *
 * @param WP_Customize_Manager $wp_customize Manager.
 */
function dadvar_theme_customize_register( $wp_customize ) {
	$wp_customize->add_section(
		'dadvar_header',
		array(
			'title'       => 'سربرگ و پابرگ',
			'priority'    => 30,
			'description' => 'شماره و نشانی در «دفتر وکالت ← اطلاعات دفتر» ویرایش می‌شوند. رنگ و فونت در «المنتور ← تنظیمات سایت».',
		)
	);

	$wp_customize->add_setting(
		'dadvar_cta_label',
		array(
			'default'           => 'درخواست مشاوره',
			'sanitize_callback' => 'sanitize_text_field',
		)
	);
	$wp_customize->add_control(
		'dadvar_cta_label',
		array(
			'label'   => 'متن دکمهٔ اصلی سربرگ',
			'section' => 'dadvar_header',
			'type'    => 'text',
		)
	);

	$wp_customize->add_setting(
		'dadvar_cta_page',
		array(
			'default'           => 0,
			'sanitize_callback' => 'absint',
		)
	);
	$wp_customize->add_control(
		'dadvar_cta_page',
		array(
			'label'       => 'مقصد دکمهٔ اصلی',
			'description' => 'خالی = برگهٔ تماس تعیین‌شده در اطلاعات دفتر.',
			'section'     => 'dadvar_header',
			'type'        => 'dropdown-pages',
		)
	);

	$wp_customize->add_setting(
		'dadvar_header_phone',
		array(
			'default'           => true,
			'sanitize_callback' => 'rest_sanitize_boolean',
		)
	);
	$wp_customize->add_control(
		'dadvar_header_phone',
		array(
			'label'   => 'نمایش دکمهٔ تماس تلفنی در سربرگ',
			'section' => 'dadvar_header',
			'type'    => 'checkbox',
		)
	);

	$wp_customize->add_setting(
		'dadvar_cta_heading',
		array(
			'default'           => 'برای بررسی موضوع خود با دفتر تماس بگیرید',
			'sanitize_callback' => 'sanitize_text_field',
		)
	);
	$wp_customize->add_control(
		'dadvar_cta_heading',
		array(
			'label'       => 'عنوان کادر دعوت به اقدام',
			'description' => 'پایین صفحه‌های خدمات و مقالات (وقتی با المنتور طراحی نشده‌اند).',
			'section'     => 'dadvar_header',
			'type'        => 'text',
		)
	);

	$wp_customize->add_setting(
		'dadvar_article_note',
		array(
			'default'           => 'این مطلب جنبهٔ آموزشی و اطلاع‌رسانی عمومی دارد و جایگزین مشاورهٔ حقوقی متناسب با شرایط شما نیست.',
			'sanitize_callback' => 'sanitize_text_field',
		)
	);
	$wp_customize->add_control(
		'dadvar_article_note',
		array(
			'label'       => 'یادداشت پایان مقاله‌ها',
			'description' => 'خالی = عدم نمایش.',
			'section'     => 'dadvar_header',
			'type'        => 'text',
		)
	);

	$wp_customize->add_setting(
		'dadvar_footer_about',
		array(
			'default'           => '',
			'sanitize_callback' => 'sanitize_textarea_field',
		)
	);
	$wp_customize->add_control(
		'dadvar_footer_about',
		array(
			'label'       => 'متن کوتاه پابرگ',
			'description' => 'خالی = معرفی کوتاه سایت (تنظیمات ← عمومی).',
			'section'     => 'dadvar_header',
			'type'        => 'textarea',
		)
	);

	$wp_customize->add_setting(
		'dadvar_copyright',
		array(
			'default'           => '© {year} {site} — همهٔ حقوق محفوظ است.',
			'sanitize_callback' => 'sanitize_text_field',
		)
	);
	$wp_customize->add_control(
		'dadvar_copyright',
		array(
			'label'       => 'متن حق نشر',
			'description' => '{year} = سال شمسی جاری، {site} = نام سایت.',
			'section'     => 'dadvar_header',
			'type'        => 'text',
		)
	);
}
add_action( 'customize_register', 'dadvar_theme_customize_register' );

/**
 * Copyright line with placeholders replaced.
 *
 * @return string
 */
function dadvar_theme_copyright() {
	$text = (string) get_theme_mod( 'dadvar_copyright', '© {year} {site} — همهٔ حقوق محفوظ است.' );
	$year = wp_date( 'Y' );
	if ( function_exists( 'dadvar_gregorian_to_jalali' ) ) {
		$parts = dadvar_gregorian_to_jalali( (int) wp_date( 'Y' ), (int) wp_date( 'n' ), (int) wp_date( 'j' ) );
		$year  = (string) $parts[0];
	}
	return str_replace( array( '{year}', '{site}' ), array( dadvar_theme_fa( $year ), get_bloginfo( 'name' ) ), $text );
}

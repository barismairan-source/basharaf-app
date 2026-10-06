<?php
/**
 * Theme supports, menus, image sizes, widget areas.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers theme features.
 */
function dadvar_theme_setup() {
	load_theme_textdomain( 'dadvar', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' ) );
	add_theme_support(
		'custom-logo',
		array(
			'height'      => 96,
			'width'       => 320,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);

	// Block editor (articles): keep posts consistent with the design system.
	add_theme_support( 'editor-styles' );
	add_editor_style( 'assets/css/editor.css' );
	add_theme_support( 'disable-custom-colors' );
	add_theme_support( 'disable-custom-gradients' );
	add_theme_support( 'disable-custom-font-sizes' );
	add_theme_support( 'editor-color-palette', array() );
	add_theme_support( 'editor-gradient-presets', array() );
	add_theme_support(
		'editor-font-sizes',
		array(
			array(
				'name' => 'کوچک',
				'slug' => 'small',
				'size' => 15,
			),
			array(
				'name' => 'معمولی',
				'slug' => 'normal',
				'size' => 17,
			),
			array(
				'name' => 'بزرگ',
				'slug' => 'large',
				'size' => 21,
			),
		)
	);

	register_nav_menus(
		array(
			'primary' => 'منوی اصلی (سربرگ)',
			'footer'  => 'منوی پابرگ',
		)
	);

	add_image_size( 'dadvar-card', 760, 428, true );
}
add_action( 'after_setup_theme', 'dadvar_theme_setup' );

/**
 * Reading width for embeds and images in articles.
 */
function dadvar_theme_content_width() {
	$GLOBALS['content_width'] = 760; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- standard theme global.
}
add_action( 'after_setup_theme', 'dadvar_theme_content_width', 0 );

/**
 * Footer widget area (optional extra column).
 */
function dadvar_theme_widgets() {
	register_sidebar(
		array(
			'name'          => 'پابرگ — ستون آزاد',
			'id'            => 'footer-extra',
			'description'   => 'اختیاری؛ مثلاً یک متن کوتاه یا نماد اعتماد.',
			'before_widget' => '<div id="%1$s" class="widget %2$s">',
			'after_widget'  => '</div>',
			'before_title'  => '<h2 class="site-footer__title">',
			'after_title'   => '</h2>',
		)
	);
}
add_action( 'widgets_init', 'dadvar_theme_widgets' );

/**
 * Body classes used by CSS.
 *
 * @param string[] $classes Classes.
 * @return string[]
 */
function dadvar_theme_body_class( $classes ) {
	if ( is_singular() && dadvar_theme_is_elementor_page() ) {
		$classes[] = 'is-elementor-page';
	}
	return $classes;
}
add_filter( 'body_class', 'dadvar_theme_body_class' );

/**
 * Excerpt length (words) for cards.
 *
 * @return int
 */
function dadvar_theme_excerpt_length() {
	return 30;
}
add_filter( 'excerpt_length', 'dadvar_theme_excerpt_length' );

/**
 * Plain ellipsis instead of [...].
 *
 * @return string
 */
function dadvar_theme_excerpt_more() {
	return '…';
}
add_filter( 'excerpt_more', 'dadvar_theme_excerpt_more' );

/**
 * Persian site without the core fa_IR language pack (e.g. offline or blocked
 * translation downloads): keep the right-to-left direction anyway.
 */
function dadvar_theme_force_rtl_for_persian() {
	global $wp_locale;
	if ( $wp_locale && ! is_rtl() && 0 === strpos( determine_locale(), 'fa' ) ) {
		$wp_locale->text_direction = 'rtl';
	}
}
add_action( 'after_setup_theme', 'dadvar_theme_force_rtl_for_persian', 1 );

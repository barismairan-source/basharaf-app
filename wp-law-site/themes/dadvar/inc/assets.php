<?php
/**
 * Front-end assets. One stylesheet, one tiny script, two locally hosted font files.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues theme assets.
 */
function dadvar_theme_assets() {
	$uri = get_template_directory_uri();
	wp_enqueue_style( 'dadvar-main', $uri . '/assets/css/main.css', array(), DADVAR_THEME_VERSION );
	wp_enqueue_script(
		'dadvar-nav',
		$uri . '/assets/js/nav.js',
		array(),
		DADVAR_THEME_VERSION,
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
}
add_action( 'wp_enqueue_scripts', 'dadvar_theme_assets' );

/**
 * Preloads the regular font weight (used above the fold on every page).
 */
function dadvar_theme_preload_font() {
	printf(
		'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
		esc_url( get_template_directory_uri() . '/assets/fonts/Vazirmatn-Regular.woff2' )
	);
}
add_action( 'wp_head', 'dadvar_theme_preload_font', 2 );

/**
 * Load core block styles only for blocks that are actually on the page.
 */
add_filter( 'should_load_separate_core_block_assets', '__return_true' );

/**
 * Removes the emoji detection script and styles (extra request, no benefit here).
 */
function dadvar_theme_disable_emoji() {
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
	remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
	remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
	remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
	add_filter( 'emoji_svg_url', '__return_false' );
}
add_action( 'init', 'dadvar_theme_disable_emoji' );

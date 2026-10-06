<?php
/**
 * Graceful behaviour when the companion plugin is not active.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether the companion plugin is active.
 *
 * @return bool
 */
function dadvar_theme_has_core() {
	return function_exists( 'dadvar_office' );
}

/**
 * Admin notice recommending the companion plugin.
 */
function dadvar_theme_core_notice() {
	if ( dadvar_theme_has_core() || ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	echo '<div class="notice notice-info"><p>' . esc_html( 'قالب Dadvar برای خدمات، اطلاعات تماس و فرم مشاوره به افزونهٔ همراه «Dadvar Core» نیاز دارد. سایت بدون آن هم کار می‌کند ولی این بخش‌ها نمایش داده نمی‌شوند.' ) . '</p></div>';
}
add_action( 'admin_notices', 'dadvar_theme_core_notice' );

/**
 * Without the plugin, hide its shortcodes instead of printing raw [dadvar_...] text.
 */
function dadvar_theme_placeholder_shortcodes() {
	if ( dadvar_theme_has_core() ) {
		return;
	}
	foreach ( array( 'dadvar_office', 'dadvar_office_info', 'dadvar_call_button', 'dadvar_services', 'dadvar_posts', 'dadvar_lawyer', 'dadvar_consultation_form' ) as $tag ) {
		add_shortcode( $tag, '__return_empty_string' );
	}
}
add_action( 'init', 'dadvar_theme_placeholder_shortcodes', 20 );

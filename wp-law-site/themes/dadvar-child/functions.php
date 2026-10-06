<?php
/**
 * Dadvar Child — code customizations that survive parent theme updates.
 *
 * @package Dadvar_Child
 */

defined( 'ABSPATH' ) || exit;

/**
 * Loads the child stylesheet after the parent's.
 */
function dadvar_child_assets() {
	wp_enqueue_style(
		'dadvar-child',
		get_stylesheet_uri(),
		array( 'dadvar-main' ),
		wp_get_theme()->get( 'Version' )
	);
}
add_action( 'wp_enqueue_scripts', 'dadvar_child_assets', 20 );

// To override a template, copy it from the parent theme into this folder with the same path.

<?php
/**
 * Elementor compatibility (all hooks are public Elementor hooks; nothing runs without Elementor).
 *
 * - Elementor Pro Theme Builder: header/footer/single/archive locations are registered,
 *   so Pro templates replace the theme's versions. Without Pro, the theme's own header
 *   and footer are shown and are edited from Appearance → Menus / Customizer.
 * - Fonts: Vazirmatn is served locally by the theme and exposed to Elementor as a
 *   system font, so Elementor never requests it from Google Fonts.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers theme locations for Elementor Pro's Theme Builder.
 *
 * @param object $manager Elementor Pro locations manager.
 */
function dadvar_theme_elementor_locations( $manager ) {
	if ( method_exists( $manager, 'register_all_core_location' ) ) {
		$manager->register_all_core_location();
	}
}
add_action( 'elementor/theme/register_locations', 'dadvar_theme_elementor_locations' );

/**
 * Prints an Elementor Pro location if a template is assigned to it.
 *
 * @param string $location header|footer|single|archive.
 * @return bool True when Elementor rendered the location.
 */
function dadvar_theme_do_location( $location ) {
	return function_exists( 'elementor_theme_do_location' ) && elementor_theme_do_location( $location );
}

/**
 * Exposes the locally hosted font to Elementor's font picker as a system font.
 *
 * @param array $fonts Additional fonts.
 * @return array
 */
function dadvar_theme_elementor_fonts( $fonts ) {
	$fonts['Vazirmatn'] = 'system';
	return $fonts;
}
add_filter( 'elementor/fonts/additional_fonts', 'dadvar_theme_elementor_fonts' );

/**
 * Never print Google Fonts links (privacy, speed and availability in Iran).
 */
add_filter( 'elementor/frontend/print_google_fonts', '__return_false' );

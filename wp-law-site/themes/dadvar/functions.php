<?php
/**
 * Dadvar theme bootstrap. Presentation only — durable data lives in the Dadvar Core plugin.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

define( 'DADVAR_THEME_VERSION', '1.0.0' );

require_once get_template_directory() . '/inc/setup.php';
require_once get_template_directory() . '/inc/assets.php';
require_once get_template_directory() . '/inc/template-tags.php';
require_once get_template_directory() . '/inc/customizer.php';
require_once get_template_directory() . '/inc/elementor.php';
require_once get_template_directory() . '/inc/compat.php';

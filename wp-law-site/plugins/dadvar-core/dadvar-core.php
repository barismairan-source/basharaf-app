<?php
/**
 * Plugin Name:       Dadvar Core — هستهٔ سایت وکالت
 * Description:       داده‌ها و قابلیت‌های ماندگار سایت وکالت: خدمات، اطلاعات دفتر، فرم درخواست مشاوره، داده‌های ساختاریافته و ابزارک‌های المنتور. با تعویض قالب از بین نمی‌رود.
 * Version:           1.0.0
 * Requires at least: 6.7
 * Requires PHP:      7.4
 * Author:            Dadvar
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       dadvar-core
 * Domain Path:       /languages
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

define( 'DADVAR_CORE_VERSION', '1.0.0' );
define( 'DADVAR_CORE_FILE', __FILE__ );
define( 'DADVAR_CORE_DIR', plugin_dir_path( __FILE__ ) );
define( 'DADVAR_CORE_URL', plugin_dir_url( __FILE__ ) );

require_once DADVAR_CORE_DIR . 'includes/helpers.php';
require_once DADVAR_CORE_DIR . 'includes/class-settings.php';
require_once DADVAR_CORE_DIR . 'includes/class-post-types.php';
require_once DADVAR_CORE_DIR . 'includes/class-migrations.php';
require_once DADVAR_CORE_DIR . 'includes/class-inquiries.php';
require_once DADVAR_CORE_DIR . 'includes/class-components.php';
require_once DADVAR_CORE_DIR . 'includes/class-form.php';
require_once DADVAR_CORE_DIR . 'includes/class-seo.php';
require_once DADVAR_CORE_DIR . 'includes/class-layout-builder.php';
require_once DADVAR_CORE_DIR . 'includes/class-layouts.php';
require_once DADVAR_CORE_DIR . 'includes/class-demo-content.php';
require_once DADVAR_CORE_DIR . 'includes/elementor/class-elementor.php';
require_once DADVAR_CORE_DIR . 'includes/class-plugin.php';

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	require_once DADVAR_CORE_DIR . 'includes/class-cli.php';
}

register_activation_hook( __FILE__, array( 'Dadvar_Core_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Dadvar_Core_Plugin', 'deactivate' ) );

Dadvar_Core_Plugin::instance();

<?php
/**
 * Plugin bootstrap.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Wires every module to WordPress hooks. Each module owns its own hooks.
 */
final class Dadvar_Core_Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var Dadvar_Core_Plugin|null
	 */
	private static $instance = null;

	/**
	 * Returns the shared instance.
	 *
	 * @return Dadvar_Core_Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Registers module hooks.
	 */
	private function __construct() {
		add_action( 'init', array( $this, 'load_textdomain' ), 0 );

		Dadvar_Core_Migrations::init();
		Dadvar_Core_Settings::init();
		Dadvar_Core_Post_Types::init();
		Dadvar_Core_Inquiries::init();
		Dadvar_Core_Components::init();
		Dadvar_Core_Form::init();
		Dadvar_Core_SEO::init();
		Dadvar_Core_Demo_Content::init();
		Dadvar_Core_Elementor::init();
	}

	/**
	 * Loads translations shipped with the plugin (optional).
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'dadvar-core', false, dirname( plugin_basename( DADVAR_CORE_FILE ) ) . '/languages' );
	}

	/**
	 * Activation: register content types, run migrations, flush rewrites.
	 * Never deletes or overwrites content.
	 */
	public static function activate() {
		Dadvar_Core_Post_Types::register();
		Dadvar_Core_Migrations::run();
		Dadvar_Core_Inquiries::schedule();
		flush_rewrite_rules();
	}

	/**
	 * Deactivation: stop scheduled jobs only. Data stays in the database.
	 */
	public static function deactivate() {
		Dadvar_Core_Inquiries::unschedule();
		flush_rewrite_rules();
	}
}

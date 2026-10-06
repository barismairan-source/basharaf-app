<?php
/**
 * Versioned, repeatable data migrations.
 *
 * Every migration must be idempotent: running it twice gives the same result
 * and it never deletes or overwrites content entered by the site manager.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Runs pending migrations when the stored schema version is behind.
 */
final class Dadvar_Core_Migrations {

	const OPTION = 'dadvar_core_schema';

	/**
	 * Current schema version. Bump together with a new entry in steps().
	 */
	const VERSION = 1;

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'maybe_run' ), 5 );
	}

	/**
	 * Runs migrations only when needed (cheap autoloaded option check).
	 */
	public static function maybe_run() {
		if ( (int) get_option( self::OPTION, 0 ) < self::VERSION ) {
			self::run();
		}
	}

	/**
	 * Migration steps keyed by target version.
	 *
	 * @return array<int, callable>
	 */
	private static function steps() {
		return array(
			1 => array( __CLASS__, 'to_1' ),
		);
	}

	/**
	 * Runs all steps above the stored version, in order.
	 */
	public static function run() {
		$current = (int) get_option( self::OPTION, 0 );
		foreach ( self::steps() as $version => $callback ) {
			if ( $version > $current ) {
				call_user_func( $callback );
				update_option( self::OPTION, $version, true );
				$current = $version;
			}
		}
	}

	/**
	 * Version 1: capability for inquiries + default settings (only when missing).
	 */
	public static function to_1() {
		$admin = get_role( 'administrator' );
		if ( $admin && ! $admin->has_cap( Dadvar_Core_Inquiries::CAPABILITY ) ) {
			$admin->add_cap( Dadvar_Core_Inquiries::CAPABILITY );
		}
		if ( false === get_option( Dadvar_Core_Settings::OPTION, false ) ) {
			add_option( Dadvar_Core_Settings::OPTION, Dadvar_Core_Settings::defaults() );
		}
	}
}

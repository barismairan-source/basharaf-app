<?php
/**
 * WP-CLI commands: `wp dadvar ...`.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Maintenance commands for the law-office site.
 */
class Dadvar_Core_CLI {

	/**
	 * Imports or removes sample content.
	 *
	 * ## OPTIONS
	 *
	 * <action>
	 * : import | remove
	 *
	 * ## EXAMPLES
	 *
	 *     wp dadvar demo import --user=admin
	 *     wp dadvar demo remove --user=admin
	 *
	 * @param array $args Positional args.
	 */
	public function demo( $args ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			WP_CLI::error( 'Run with --user=<administrator> so Elementor can save pages.' );
		}
		if ( 'import' === $args[0] ) {
			$report = Dadvar_Core_Demo_Content::import();
			WP_CLI::log( 'Created: ' . implode( ', ', $report['created'] ) );
			WP_CLI::log( 'Skipped: ' . implode( ', ', $report['skipped'] ) );
			foreach ( $report['warnings'] as $warning ) {
				WP_CLI::warning( $warning );
			}
			WP_CLI::success( 'Sample content import finished.' );
		} elseif ( 'remove' === $args[0] ) {
			$report = Dadvar_Core_Demo_Content::remove();
			WP_CLI::log( 'Deleted: ' . implode( ', ', $report['deleted'] ) );
			WP_CLI::log( 'Kept (edited): ' . implode( ', ', $report['kept'] ) );
			WP_CLI::success( 'Done.' );
		} else {
			WP_CLI::error( 'Unknown action. Use import or remove.' );
		}
	}

	/**
	 * Writes Elementor-importable page templates (JSON) to a directory.
	 *
	 * ## OPTIONS
	 *
	 * <dir>
	 * : Output directory.
	 *
	 * @subcommand export-templates
	 *
	 * @param array $args Positional args.
	 */
	public function export_templates( $args ) {
		$dir = rtrim( $args[0], '/' );
		if ( ! is_dir( $dir ) && ! wp_mkdir_p( $dir ) ) {
			WP_CLI::error( 'Cannot create ' . $dir );
		}
		$ctx                  = array(
			'contact_url'  => '/contact/',
			'about_url'    => '/about/',
			'articles_url' => '/articles/',
			'services_url' => '/services/',
			'image_id'     => 0,
		);
		$templates            = array(
			'home'    => array( 'خانه', Dadvar_Core_Layouts::home( $ctx ) ),
			'about'   => array( 'دربارهٔ وکیل', Dadvar_Core_Layouts::about( $ctx ) ),
			'contact' => array( 'تماس و درخواست مشاوره', Dadvar_Core_Layouts::contact( $ctx ) ),
		);
		$services             = Dadvar_Core_Layouts::services();
		$templates['service'] = array( 'قالب صفحهٔ خدمت', Dadvar_Core_Layouts::service( reset( $services ), $ctx ) );

		foreach ( $templates as $slug => $template ) {
			$json = array(
				'version'       => '0.4',
				'title'         => $template[0],
				'type'          => 'page',
				'content'       => self::objectify( $template[1] ),
				'page_settings' => new stdClass(),
			);
			$file = $dir . '/dadvar-' . $slug . '.json';
			file_put_contents( $file, wp_json_encode( $json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . "\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- CLI build step.
			WP_CLI::log( 'Wrote ' . $file );
		}
		WP_CLI::success( 'Templates exported.' );
	}

	/**
	 * Empty settings must be JSON objects ({}), not arrays ([]).
	 *
	 * @param array $elements Elements.
	 * @return array
	 */
	private static function objectify( array $elements ) {
		foreach ( $elements as &$element ) {
			if ( empty( $element['settings'] ) ) {
				$element['settings'] = new stdClass();
			}
			$element['elements'] = self::objectify( $element['elements'] );
		}
		return $elements;
	}

	/**
	 * Deletes consultation requests older than the retention period now.
	 *
	 * @subcommand purge-inquiries
	 */
	public function purge_inquiries() {
		WP_CLI::success( 'Deleted: ' . Dadvar_Core_Inquiries::purge_expired() );
	}

	/**
	 * Runs pending data migrations (safe to repeat).
	 */
	public function migrate() {
		Dadvar_Core_Migrations::run();
		WP_CLI::success( 'Schema version: ' . get_option( Dadvar_Core_Migrations::OPTION ) );
	}
}

WP_CLI::add_command( 'dadvar', 'Dadvar_Core_CLI' );

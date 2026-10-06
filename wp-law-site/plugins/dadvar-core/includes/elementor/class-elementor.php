<?php
/**
 * Elementor integration (optional). Everything here is skipped when Elementor is inactive.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the widget category, widgets and Elementor support for our content types.
 */
final class Dadvar_Core_Elementor {

	/**
	 * Hooks. Only public Elementor hooks are used.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'post_type_support' ), 20 );
		add_action( 'elementor/elements/categories_registered', array( __CLASS__, 'category' ) );
		add_action( 'elementor/widgets/register', array( __CLASS__, 'widgets' ) );
	}

	/**
	 * Whether Elementor is loaded.
	 *
	 * @return bool
	 */
	public static function active() {
		return did_action( 'elementor/loaded' ) && class_exists( '\Elementor\Plugin' );
	}

	/**
	 * Lets services and members be designed with Elementor.
	 */
	public static function post_type_support() {
		add_post_type_support( Dadvar_Core_Post_Types::SERVICE, 'elementor' );
		if ( post_type_exists( Dadvar_Core_Post_Types::MEMBER ) ) {
			add_post_type_support( Dadvar_Core_Post_Types::MEMBER, 'elementor' );
		}
	}

	/**
	 * Widget panel category.
	 *
	 * @param \Elementor\Elements_Manager $manager Elements manager.
	 */
	public static function category( $manager ) {
		$manager->add_category(
			'dadvar',
			array(
				'title' => 'سایت وکالت',
				'icon'  => 'eicon-folder',
			)
		);
	}

	/**
	 * Registers widgets.
	 *
	 * @param \Elementor\Widgets_Manager $manager Widgets manager.
	 */
	public static function widgets( $manager ) {
		$dir = DADVAR_CORE_DIR . 'includes/elementor/widgets/';
		require_once $dir . 'class-widget-base.php';
		$widgets = array(
			'class-office-info.php'       => 'Dadvar_Widget_Office_Info',
			'class-call-button.php'       => 'Dadvar_Widget_Call_Button',
			'class-consultation-form.php' => 'Dadvar_Widget_Consultation_Form',
			'class-services.php'          => 'Dadvar_Widget_Services',
			'class-posts.php'             => 'Dadvar_Widget_Posts',
			'class-lawyer.php'            => 'Dadvar_Widget_Lawyer',
		);
		foreach ( $widgets as $file => $class ) {
			require_once $dir . $file;
			$manager->register( new $class() );
		}
	}

	/**
	 * Whether a post is built with Elementor (public Documents API).
	 *
	 * @param int $post_id Post ID.
	 * @return bool
	 */
	public static function is_built_with_elementor( $post_id ) {
		if ( ! self::active() ) {
			return false;
		}
		$document = \Elementor\Plugin::$instance->documents->get( $post_id );
		return $document && $document->is_built_with_elementor();
	}
}

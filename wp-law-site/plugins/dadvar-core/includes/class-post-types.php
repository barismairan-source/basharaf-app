<?php
/**
 * Public content types: services (always) and members (multi-member offices only).
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers content types that must survive a theme switch.
 */
final class Dadvar_Core_Post_Types {

	const SERVICE = 'dadvar_service';
	const MEMBER  = 'dadvar_member';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register' ) );
		add_action( 'init', array( __CLASS__, 'maybe_flush' ), 99 );
		add_action( 'add_meta_boxes_' . self::MEMBER, array( __CLASS__, 'member_meta_box' ) );
		add_action( 'save_post_' . self::MEMBER, array( __CLASS__, 'save_member_meta' ) );
	}

	/**
	 * Member fields that are not part of the page body.
	 *
	 * @return array
	 */
	private static function member_fields() {
		return array(
			'dadvar_role'           => 'عنوان حرفه‌ای (مثلاً وکیل پایه‌یک دادگستری)',
			'dadvar_license_number' => 'شمارهٔ پروانه (فقط عدد واقعی؛ خالی = عدم نمایش)',
		);
	}

	/**
	 * Adds the member details box.
	 */
	public static function member_meta_box() {
		add_meta_box(
			'dadvar_member_details',
			'مشخصات حرفه‌ای',
			function ( $post ) {
				wp_nonce_field( 'dadvar_member_meta', 'dadvar_member_nonce' );
				foreach ( self::member_fields() as $key => $label ) {
					printf(
						'<p><label for="%1$s">%2$s</label><br><input type="text" class="widefat" id="%1$s" name="%1$s" value="%3$s"></p>',
						esc_attr( $key ),
						esc_html( $label ),
						esc_attr( get_post_meta( $post->ID, $key, true ) )
					);
				}
			},
			self::MEMBER,
			'side'
		);
	}

	/**
	 * Saves member details. Checks nonce (authenticity) and capability (authorization) separately.
	 *
	 * @param int $post_id Post ID.
	 */
	public static function save_member_meta( $post_id ) {
		if ( ! isset( $_POST['dadvar_member_nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['dadvar_member_nonce'] ) ), 'dadvar_member_meta' ) ) {
			return;
		}
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		foreach ( array_keys( self::member_fields() ) as $key ) {
			if ( isset( $_POST[ $key ] ) ) {
				update_post_meta( $post_id, $key, sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) );
			}
		}
	}

	/**
	 * Registers post types and their meta.
	 */
	public static function register() {
		register_post_type(
			self::SERVICE,
			array(
				'labels'        => array(
					'name'               => 'خدمات',
					'singular_name'      => 'خدمت',
					'menu_name'          => 'خدمات',
					'add_new'            => 'افزودن خدمت',
					'add_new_item'       => 'افزودن خدمت تازه',
					'edit_item'          => 'ویرایش خدمت',
					'new_item'           => 'خدمت تازه',
					'view_item'          => 'نمایش خدمت',
					'view_items'         => 'نمایش خدمات',
					'search_items'       => 'جست‌وجوی خدمات',
					'not_found'          => 'خدمتی پیدا نشد.',
					'not_found_in_trash' => 'خدمتی در زباله‌دان نیست.',
					'all_items'          => 'همهٔ خدمات',
					'archives'           => 'خدمات',
				),
				'description'   => 'حوزه‌های تخصصی و خدمات حقوقی دفتر.',
				'public'        => true,
				'has_archive'   => 'services',
				'rewrite'       => array(
					'slug'       => 'services',
					'with_front' => false,
				),
				'menu_icon'     => 'dashicons-portfolio',
				'menu_position' => 5,
				'show_in_rest'  => true,
				'supports'      => array( 'title', 'editor', 'excerpt', 'thumbnail', 'page-attributes', 'revisions', 'custom-fields' ),
			)
		);

		register_post_meta(
			self::SERVICE,
			'dadvar_short_label',
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function () {
					return current_user_can( 'edit_posts' );
				},
				'description'       => 'نام کوتاه برای منوی کشویی فرم (اختیاری).',
			)
		);

		if ( dadvar_is_multi_member() ) {
			register_post_type(
				self::MEMBER,
				array(
					'labels'        => array(
						'name'          => 'اعضا',
						'singular_name' => 'عضو',
						'add_new'       => 'افزودن عضو',
						'add_new_item'  => 'افزودن عضو تازه',
						'edit_item'     => 'ویرایش عضو',
						'all_items'     => 'همهٔ اعضا',
						'not_found'     => 'عضوی پیدا نشد.',
					),
					'public'        => true,
					'has_archive'   => 'team',
					'rewrite'       => array(
						'slug'       => 'team',
						'with_front' => false,
					),
					'menu_icon'     => 'dashicons-groups',
					'menu_position' => 6,
					'show_in_rest'  => true,
					'supports'      => array( 'title', 'editor', 'excerpt', 'thumbnail', 'page-attributes', 'revisions' ),
				)
			);
			foreach ( array( 'dadvar_role', 'dadvar_license_number' ) as $meta_key ) {
				register_post_meta(
					self::MEMBER,
					$meta_key,
					array(
						'type'              => 'string',
						'single'            => true,
						'show_in_rest'      => true,
						'sanitize_callback' => 'sanitize_text_field',
						'auth_callback'     => function () {
							return current_user_can( 'edit_posts' );
						},
					)
				);
			}
		}
	}

	/**
	 * Flushes rewrite rules once after the member type was toggled.
	 */
	public static function maybe_flush() {
		if ( get_option( 'dadvar_flush_rewrite' ) ) {
			delete_option( 'dadvar_flush_rewrite' );
			flush_rewrite_rules();
		}
	}

	/**
	 * Published services for menus, forms and widgets.
	 *
	 * @param int $limit Max items (-1 = all).
	 * @return WP_Post[]
	 */
	public static function services( $limit = -1 ) {
		return get_posts(
			array(
				'post_type'        => self::SERVICE,
				'post_status'      => 'publish',
				'posts_per_page'   => $limit,
				'orderby'          => array(
					'menu_order' => 'ASC',
					'title'      => 'ASC',
				),
				'no_found_rows'    => true,
				'suppress_filters' => false,
			)
		);
	}
}

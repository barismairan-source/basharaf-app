<?php
/**
 * Consultation requests: private storage, admin screens, retention and privacy tools.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Stores each request as a private post (never public, never in REST or search).
 */
final class Dadvar_Core_Inquiries {

	const POST_TYPE  = 'dadvar_inquiry';
	const CAPABILITY = 'dadvar_manage_inquiries';
	const CRON_HOOK  = 'dadvar_purge_inquiries';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register' ) );
		add_action( 'init', array( __CLASS__, 'schedule' ) );
		add_action( self::CRON_HOOK, array( __CLASS__, 'purge_expired' ) );
		add_action( 'add_meta_boxes_' . self::POST_TYPE, array( __CLASS__, 'meta_boxes' ) );
		add_action( 'save_post_' . self::POST_TYPE, array( __CLASS__, 'save_status' ) );
		add_filter( 'manage_' . self::POST_TYPE . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . self::POST_TYPE . '_posts_custom_column', array( __CLASS__, 'column_value' ), 10, 2 );
		add_filter( 'post_row_actions', array( __CLASS__, 'row_actions' ), 10, 2 );
		add_filter( 'wp_privacy_personal_data_exporters', array( __CLASS__, 'register_exporter' ) );
		add_filter( 'wp_privacy_personal_data_erasers', array( __CLASS__, 'register_eraser' ) );
		add_action( 'admin_init', array( __CLASS__, 'privacy_policy_text' ) );
	}

	/**
	 * Status labels.
	 *
	 * @return array
	 */
	public static function statuses() {
		return array(
			'new'       => 'جدید',
			'contacted' => 'تماس گرفته شد',
			'closed'    => 'بسته شد',
		);
	}

	/**
	 * Registers the private post type.
	 */
	public static function register() {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => 'درخواست‌های مشاوره',
					'singular_name' => 'درخواست مشاوره',
					'menu_name'     => 'درخواست‌ها',
					'edit_item'     => 'جزئیات درخواست',
					'all_items'     => 'همهٔ درخواست‌ها',
					'not_found'     => 'هنوز درخواستی ثبت نشده است.',
					'search_items'  => 'جست‌وجوی درخواست‌ها',
				),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_ui'             => true,
				'show_in_menu'        => Dadvar_Core_Settings::PAGE,
				'show_in_rest'        => false,
				'show_in_nav_menus'   => false,
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
				'supports'            => array( 'title' ),
				'capability_type'     => 'dadvar_inquiry',
				'map_meta_cap'        => false,
				'capabilities'        => array(
					'edit_post'              => self::CAPABILITY,
					'read_post'              => self::CAPABILITY,
					'delete_post'            => self::CAPABILITY,
					'edit_posts'             => self::CAPABILITY,
					'edit_others_posts'      => self::CAPABILITY,
					'delete_posts'           => self::CAPABILITY,
					'delete_others_posts'    => self::CAPABILITY,
					'delete_private_posts'   => self::CAPABILITY,
					'delete_published_posts' => self::CAPABILITY,
					'edit_private_posts'     => self::CAPABILITY,
					'edit_published_posts'   => self::CAPABILITY,
					'publish_posts'          => self::CAPABILITY,
					'read_private_posts'     => self::CAPABILITY,
					'create_posts'           => 'do_not_allow',
				),
			)
		);
	}

	/**
	 * Saves a validated request. Caller is responsible for validation.
	 *
	 * @param array $data Clean data: name, phone, email, topic, time, message, source.
	 * @return int|WP_Error Post ID.
	 */
	public static function create( array $data ) {
		$post_id = wp_insert_post(
			array(
				'post_type'   => self::POST_TYPE,
				'post_status' => 'private',
				'post_title'  => $data['name'],
				'meta_input'  => array(
					'_dadvar_phone'   => $data['phone'],
					'_dadvar_email'   => $data['email'],
					'_dadvar_topic'   => $data['topic'],
					'_dadvar_time'    => $data['time'],
					'_dadvar_message' => $data['message'],
					'_dadvar_source'  => $data['source'],
					'_dadvar_status'  => 'new',
				),
			),
			true
		);
		return $post_id;
	}

	/**
	 * Daily retention job.
	 */
	public static function schedule() {
		if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::CRON_HOOK );
		}
	}

	/**
	 * Removes the retention job (plugin deactivation).
	 */
	public static function unschedule() {
		wp_clear_scheduled_hook( self::CRON_HOOK );
	}

	/**
	 * Permanently deletes requests older than the retention period.
	 *
	 * @return int Number of deleted requests.
	 */
	public static function purge_expired() {
		$days = (int) dadvar_office( 'retention_days', 0 );
		if ( $days < 1 ) {
			return 0;
		}
		$deleted = 0;
		do {
			$ids = get_posts(
				array(
					'post_type'      => self::POST_TYPE,
					'post_status'    => 'any',
					'fields'         => 'ids',
					'posts_per_page' => 100,
					'no_found_rows'  => true,
					'date_query'     => array(
						array(
							'before' => gmdate( 'Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS ),
							'column' => 'post_date_gmt',
						),
					),
				)
			);
			foreach ( $ids as $id ) {
				if ( wp_delete_post( $id, true ) ) {
					++$deleted;
				}
			}
			$batch = count( $ids );
		} while ( 100 === $batch );
		return $deleted;
	}

	/**
	 * Read-only details + status box.
	 */
	public static function meta_boxes() {
		remove_meta_box( 'submitdiv', self::POST_TYPE, 'side' );
		add_meta_box(
			'dadvar_inquiry_details',
			'جزئیات درخواست',
			array( __CLASS__, 'render_details' ),
			self::POST_TYPE,
			'normal',
			'high'
		);
		add_meta_box(
			'dadvar_inquiry_status',
			'وضعیت پیگیری',
			array( __CLASS__, 'render_status' ),
			self::POST_TYPE,
			'side',
			'high'
		);
	}

	/**
	 * Details box.
	 *
	 * @param WP_Post $post Request.
	 */
	public static function render_details( $post ) {
		$phone = get_post_meta( $post->ID, '_dadvar_phone', true );
		$email = get_post_meta( $post->ID, '_dadvar_email', true );
		$rows  = array(
			'نام'               => esc_html( $post->post_title ),
			'تلفن'              => $phone ? '<a dir="ltr" href="' . esc_url( dadvar_tel_href( $phone ) ) . '">' . esc_html( $phone ) . '</a>' : '—',
			'ایمیل'             => $email ? '<a dir="ltr" href="mailto:' . esc_attr( $email ) . '">' . esc_html( $email ) . '</a>' : '—',
			'موضوع'             => esc_html( ( get_post_meta( $post->ID, '_dadvar_topic', true ) ? get_post_meta( $post->ID, '_dadvar_topic', true ) : '—' ) ),
			'زمان مناسب تماس'   => esc_html( ( get_post_meta( $post->ID, '_dadvar_time', true ) ? get_post_meta( $post->ID, '_dadvar_time', true ) : '—' ) ),
			'شرح کوتاه'         => nl2br( esc_html( ( get_post_meta( $post->ID, '_dadvar_message', true ) ? get_post_meta( $post->ID, '_dadvar_message', true ) : '—' ) ) ),
			'زمان ثبت'          => esc_html( dadvar_jalali_date( get_post_time( 'U', true, $post ) ) . ' — ' . get_post_time( 'H:i', false, $post ) ),
			'صفحهٔ ارسال'       => esc_html( ( get_post_meta( $post->ID, '_dadvar_source', true ) ? get_post_meta( $post->ID, '_dadvar_source', true ) : '—' ) ),
			'ایمیل اطلاع‌رسانی' => esc_html( self::mail_label( get_post_meta( $post->ID, '_dadvar_mail', true ) ) ),
		);
		echo '<table class="widefat striped"><tbody>';
		foreach ( $rows as $label => $value ) {
			echo '<tr><th style="width:11em">' . esc_html( $label ) . '</th><td>' . wp_kses_post( $value ) . '</td></tr>';
		}
		echo '</tbody></table>';
		echo '<p class="description">' . esc_html( 'این درخواست پس از پایان مدت نگهداری (تنظیمات دفتر) خودکار حذف می‌شود.' ) . '</p>';
	}

	/**
	 * Human label for the stored mail result.
	 *
	 * @param string $result Stored value.
	 * @return string
	 */
	private static function mail_label( $result ) {
		if ( 'accepted' === $result ) {
			return 'به سرور ایمیل تحویل شد (دریافت نهایی تضمین نیست)';
		}
		if ( 'failed' === $result ) {
			return 'ارسال ناموفق — تنظیمات ایمیل هاست/SMTP را بررسی کنید';
		}
		return '—';
	}

	/**
	 * Status box (replaces the publish box).
	 *
	 * @param WP_Post $post Request.
	 */
	public static function render_status( $post ) {
		wp_nonce_field( 'dadvar_inquiry_status', 'dadvar_inquiry_nonce' );
		$current = ( get_post_meta( $post->ID, '_dadvar_status', true ) ? get_post_meta( $post->ID, '_dadvar_status', true ) : 'new' );
		echo '<label for="dadvar_status" class="screen-reader-text">وضعیت</label><select id="dadvar_status" name="dadvar_status" class="widefat">';
		foreach ( self::statuses() as $key => $label ) {
			printf( '<option value="%1$s" %2$s>%3$s</option>', esc_attr( $key ), selected( $current, $key, false ), esc_html( $label ) );
		}
		echo '</select><p><button type="submit" class="button button-primary">ذخیرهٔ وضعیت</button> ';
		$delete = get_delete_post_link( $post->ID, '', true );
		if ( $delete ) {
			echo '<a class="submitdelete" style="color:#b32d2e" href="' . esc_url( $delete ) . '" onclick="return confirm(\'حذف دائمی این درخواست؟\')">حذف دائمی</a>';
		}
		echo '</p>';
	}

	/**
	 * Saves the status (nonce = authenticity, capability = authorization).
	 *
	 * @param int $post_id Request ID.
	 */
	public static function save_status( $post_id ) {
		if ( ! isset( $_POST['dadvar_inquiry_nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['dadvar_inquiry_nonce'] ) ), 'dadvar_inquiry_status' ) ) {
			return;
		}
		if ( ! current_user_can( self::CAPABILITY ) ) {
			return;
		}
		$status = isset( $_POST['dadvar_status'] ) ? sanitize_key( wp_unslash( $_POST['dadvar_status'] ) ) : '';
		if ( array_key_exists( $status, self::statuses() ) ) {
			update_post_meta( $post_id, '_dadvar_status', $status );
		}
	}

	/**
	 * List columns.
	 *
	 * @param array $columns Columns.
	 * @return array
	 */
	public static function columns( $columns ) {
		return array(
			'cb'            => $columns['cb'],
			'title'         => 'نام',
			'dadvar_phone'  => 'تلفن',
			'dadvar_topic'  => 'موضوع',
			'dadvar_status' => 'وضعیت',
			'date'          => 'زمان ثبت',
		);
	}

	/**
	 * Column values.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Request ID.
	 */
	public static function column_value( $column, $post_id ) {
		switch ( $column ) {
			case 'dadvar_phone':
				echo '<span dir="ltr">' . esc_html( get_post_meta( $post_id, '_dadvar_phone', true ) ) . '</span>';
				break;
			case 'dadvar_topic':
				echo esc_html( ( get_post_meta( $post_id, '_dadvar_topic', true ) ? get_post_meta( $post_id, '_dadvar_topic', true ) : '—' ) );
				break;
			case 'dadvar_status':
				$statuses = self::statuses();
				$status   = ( get_post_meta( $post_id, '_dadvar_status', true ) ? get_post_meta( $post_id, '_dadvar_status', true ) : 'new' );
				echo esc_html( isset( $statuses[ $status ] ) ? $statuses[ $status ] : $status );
				break;
		}
	}

	/**
	 * Removes "quick edit" and "view" (requests are not public).
	 *
	 * @param array   $actions Row actions.
	 * @param WP_Post $post    Post.
	 * @return array
	 */
	public static function row_actions( $actions, $post ) {
		if ( self::POST_TYPE === $post->post_type ) {
			unset( $actions['inline hide-if-no-js'], $actions['view'] );
		}
		return $actions;
	}

	/**
	 * Registers the personal data exporter.
	 *
	 * @param array $exporters Exporters.
	 * @return array
	 */
	public static function register_exporter( $exporters ) {
		$exporters['dadvar-inquiries'] = array(
			'exporter_friendly_name' => 'درخواست‌های مشاوره',
			'callback'               => array( __CLASS__, 'export_personal_data' ),
		);
		return $exporters;
	}

	/**
	 * Registers the personal data eraser.
	 *
	 * @param array $erasers Erasers.
	 * @return array
	 */
	public static function register_eraser( $erasers ) {
		$erasers['dadvar-inquiries'] = array(
			'eraser_friendly_name' => 'درخواست‌های مشاوره',
			'callback'             => array( __CLASS__, 'erase_personal_data' ),
		);
		return $erasers;
	}

	/**
	 * Requests that belong to an email address.
	 *
	 * @param string $email Email.
	 * @param int    $page  Page (1-based).
	 * @return int[]
	 */
	private static function ids_by_email( $email, $page ) {
		return get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'any',
				'fields'         => 'ids',
				'posts_per_page' => 50,
				'paged'          => $page,
				'meta_key'       => '_dadvar_email', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key -- privacy tool, rare.
				'meta_value'     => $email, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_value
			)
		);
	}

	/**
	 * Exporter callback.
	 *
	 * @param string $email Email.
	 * @param int    $page  Page.
	 * @return array
	 */
	public static function export_personal_data( $email, $page = 1 ) {
		$items = array();
		$ids   = self::ids_by_email( $email, $page );
		foreach ( $ids as $id ) {
			$items[] = array(
				'group_id'    => 'dadvar-inquiries',
				'group_label' => 'درخواست‌های مشاوره',
				'item_id'     => 'dadvar-inquiry-' . $id,
				'data'        => array(
					array(
						'name'  => 'نام',
						'value' => get_the_title( $id ),
					),
					array(
						'name'  => 'تلفن',
						'value' => get_post_meta( $id, '_dadvar_phone', true ),
					),
					array(
						'name'  => 'ایمیل',
						'value' => get_post_meta( $id, '_dadvar_email', true ),
					),
					array(
						'name'  => 'موضوع',
						'value' => get_post_meta( $id, '_dadvar_topic', true ),
					),
					array(
						'name'  => 'شرح',
						'value' => get_post_meta( $id, '_dadvar_message', true ),
					),
					array(
						'name'  => 'تاریخ',
						'value' => get_post_time( 'Y-m-d H:i', true, $id ),
					),
				),
			);
		}
		return array(
			'data' => $items,
			'done' => count( $ids ) < 50,
		);
	}

	/**
	 * Eraser callback: deletes the requests completely.
	 *
	 * @param string $email Email.
	 * @param int    $page  Page (ignored: we always delete the first batch).
	 * @return array
	 */
	public static function erase_personal_data( $email, $page = 1 ) {
		unset( $page );
		$ids     = self::ids_by_email( $email, 1 );
		$removed = false;
		foreach ( $ids as $id ) {
			$removed = (bool) wp_delete_post( $id, true ) || $removed;
		}
		return array(
			'items_removed'  => $removed,
			'items_retained' => false,
			'messages'       => array(),
			'done'           => count( $ids ) < 50,
		);
	}

	/**
	 * Suggested privacy-policy text (Settings → Privacy → Policy guide).
	 */
	public static function privacy_policy_text() {
		if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
			return;
		}
		$content = '<p>فرم درخواست مشاوره نام، شمارهٔ تماس، ایمیل (اختیاری)، موضوع، زمان مناسب تماس و شرح کوتاه را دریافت می‌کند. این اطلاعات فقط برای تماس اولیه استفاده و در پایگاه دادهٔ سایت نگهداری می‌شود و پس از مدت تعیین‌شده در تنظیمات دفتر خودکار حذف می‌شود. نشانی IP به‌صورت خام ذخیره نمی‌شود و فقط شکل درهم‌سازی‌شدهٔ آن برای مدت کوتاهی جهت جلوگیری از ارسال مکرر نگهداری می‌شود.</p>';
		wp_add_privacy_policy_content( 'Dadvar Core', wp_kses_post( $content ) );
	}
}

<?php
/**
 * Optional sample content importer.
 *
 * Rules:
 * - Never runs automatically; only from «دفتر وکالت ← محتوای نمونه» or WP-CLI.
 * - Repeatable: every item carries a key; existing keys are skipped (no duplicates).
 * - Never overwrites: only creates missing items and only fills empty settings.
 * - Removal deletes only sample items that were not edited since import.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sample content.
 */
final class Dadvar_Core_Demo_Content {

	const KEY_META      = '_dadvar_demo_key';
	const HASH_META     = '_dadvar_demo_hash';
	const SETTINGS_FLAG = 'dadvar_demo_settings';
	const PAGE          = 'dadvar-demo';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ), 20 );
		add_action( 'admin_post_dadvar_demo_import', array( __CLASS__, 'handle_import' ) );
		add_action( 'admin_post_dadvar_demo_remove', array( __CLASS__, 'handle_remove' ) );
		add_action( 'admin_notices', array( __CLASS__, 'sample_settings_notice' ) );
		add_filter( 'dadvar_legal_service_schema', array( __CLASS__, 'block_schema_with_samples' ) );
	}

	/**
	 * Submenu.
	 */
	public static function menu() {
		add_submenu_page( Dadvar_Core_Settings::PAGE, 'محتوای نمونه', 'محتوای نمونه', 'manage_options', self::PAGE, array( __CLASS__, 'render_page' ) );
	}

	/**
	 * Tools page.
	 */
	public static function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$report = get_transient( 'dadvar_demo_report_' . get_current_user_id() );
		delete_transient( 'dadvar_demo_report_' . get_current_user_id() );
		echo '<div class="wrap"><h1>محتوای نمونه</h1>';
		if ( is_array( $report ) ) {
			echo '<div class="notice notice-success"><p>' . esc_html( sprintf( 'ایجاد شد: %d — ردشده (از قبل موجود یا ویرایش‌شده): %d', count( $report['created'] ), count( $report['skipped'] ) ) ) . '</p>';
			if ( ! empty( $report['warnings'] ) ) {
				echo '<ul>';
				foreach ( $report['warnings'] as $warning ) {
					echo '<li>' . esc_html( $warning ) . '</li>';
				}
				echo '</ul>';
			}
			echo '</div>';
		}
		echo '<p>این ابزار صفحه‌های اصلی، چهار خدمت نمونه، سه مقالهٔ نمونه، منوها و تنظیمات ظاهری المنتور را می‌سازد تا ساختار سایت را ببینید و محتوای واقعی را جایگزین کنید.</p>';
		echo '<ul style="list-style:disc;padding-inline-start:2em">';
		echo '<li>چندبار اجرا کردن آن موارد تکراری نمی‌سازد.</li>';
		echo '<li>هیچ محتوای موجود یا تنظیم پرشده‌ای را بازنویسی نمی‌کند.</li>';
		echo '<li>بهتر است پیش از اجرا، المنتور فعال باشد تا صفحه‌ها با ابزارک‌های المنتور ساخته شوند.</li>';
		echo '<li>همهٔ متن‌ها با «نمونه» علامت خورده‌اند و پیش از انتشار عمومی باید جایگزین شوند.</li>';
		echo '</ul>';
		echo '<p>وضعیت المنتور: <strong>' . esc_html( Dadvar_Core_Elementor::active() ? 'فعال' : 'غیرفعال (صفحه‌ها با HTML ساده ساخته می‌شوند)' ) . '</strong></p>';
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" style="display:inline-block;margin-inline-end:1em">';
		wp_nonce_field( 'dadvar_demo_import' );
		echo '<input type="hidden" name="action" value="dadvar_demo_import">';
		submit_button( 'ورود محتوای نمونه', 'primary', 'submit', false );
		echo '</form>';
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" style="display:inline-block" onsubmit="return confirm(\'فقط موارد نمونهٔ ویرایش‌نشده حذف می‌شوند. ادامه؟\')">';
		wp_nonce_field( 'dadvar_demo_remove' );
		echo '<input type="hidden" name="action" value="dadvar_demo_remove">';
		submit_button( 'حذف محتوای نمونهٔ ویرایش‌نشده', 'secondary', 'submit', false );
		echo '</form></div>';
	}

	/**
	 * Import request (nonce = authenticity, capability = authorization).
	 */
	public static function handle_import() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'دسترسی کافی ندارید.', 403 );
		}
		check_admin_referer( 'dadvar_demo_import' );
		set_transient( 'dadvar_demo_report_' . get_current_user_id(), self::import(), 5 * MINUTE_IN_SECONDS );
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE ) );
		exit;
	}

	/**
	 * Remove request.
	 */
	public static function handle_remove() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'دسترسی کافی ندارید.', 403 );
		}
		check_admin_referer( 'dadvar_demo_remove' );
		$report = self::remove();
		set_transient(
			'dadvar_demo_report_' . get_current_user_id(),
			array(
				'created'  => array(),
				'skipped'  => $report['kept'],
				'warnings' => array( sprintf( 'حذف شد: %d مورد. نگه‌داشته شد (ویرایش‌شده): %d مورد.', count( $report['deleted'] ), count( $report['kept'] ) ) ),
			),
			5 * MINUTE_IN_SECONDS
		);
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE ) );
		exit;
	}

	/**
	 * Finds an item previously created by the importer.
	 *
	 * @param string $key Item key.
	 * @return int Post ID or 0.
	 */
	public static function find( $key ) {
		$ids = get_posts(
			array(
				'post_type'      => 'any',
				'post_status'    => array( 'publish', 'draft', 'private', 'pending', 'future' ),
				'fields'         => 'ids',
				'posts_per_page' => 1,
				'no_found_rows'  => true,
				'meta_key'       => self::KEY_META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key -- admin-only tool.
				'meta_value'     => $key, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_value
			)
		);
		return $ids ? (int) $ids[0] : 0;
	}

	/**
	 * Fingerprint of a post's editable content.
	 *
	 * @param int $post_id Post ID.
	 * @return string
	 */
	private static function fingerprint( $post_id ) {
		clean_post_cache( $post_id );
		$post = get_post( $post_id );
		return md5( $post->post_title . '|' . $post->post_content . '|' . $post->post_excerpt . '|' . (string) get_post_meta( $post_id, '_elementor_data', true ) );
	}

	/**
	 * Runs the import.
	 *
	 * @return array { created: string[], skipped: string[], warnings: string[] }
	 */
	public static function import() {
		$report = array(
			'created'  => array(),
			'skipped'  => array(),
			'warnings' => array(),
		);
		if ( ! Dadvar_Core_Elementor::active() ) {
			$report['warnings'][] = 'المنتور فعال نبود؛ صفحه‌ها با HTML ساده ساخته شدند و در المنتور «ساخته‌شده با المنتور» نیستند.';
		}

		$image_id = self::placeholder_image( $report );

		// Pages first (their URLs are needed by the layouts).
		$pages = array(
			'page_home'       => array( 'خانه', 'home', '' ),
			'page_about'      => array( 'دربارهٔ وکیل', 'about', '[نمونه] معرفی وکیل، سوابق حرفه‌ای و شیوهٔ همکاری.' ),
			'page_contact'    => array( 'تماس و درخواست مشاوره', 'contact', 'راه‌های تماس با دفتر و فرم درخواست وقت مشاورهٔ حقوقی.' ),
			'page_articles'   => array( 'مقالات', 'articles', 'مقالات و راهنماهای حقوقی عمومی.' ),
			'page_privacy'    => array( 'حریم خصوصی', 'privacy', 'چه اطلاعاتی در این سایت جمع‌آوری و چگونه نگهداری می‌شود.' ),
			'page_disclaimer' => array( 'توضیحات حقوقی', 'legal-notice', 'محدودیت‌های مطالب این سایت و ماهیت ارتباط با دفتر.' ),
		);
		$ids   = array();
		foreach ( $pages as $key => $page ) {
			$existing = self::find( $key );
			if ( $existing ) {
				$ids[ $key ]         = $existing;
				$report['skipped'][] = $key;
				continue;
			}
			$ids[ $key ]           = (int) wp_insert_post(
				array(
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_title'   => $page[0],
					'post_name'    => $page[1],
					'post_excerpt' => $page[2],
					'post_content' => '',
					'meta_input'   => array( self::KEY_META => $key ),
				)
			);
			$ids[ $key . '__new' ] = true;
		}

		$ctx = array(
			'contact_url'  => get_permalink( $ids['page_contact'] ),
			'about_url'    => get_permalink( $ids['page_about'] ),
			'articles_url' => get_permalink( $ids['page_articles'] ),
			'services_url' => get_post_type_archive_link( Dadvar_Core_Post_Types::SERVICE ),
			'image_id'     => $image_id,
		);

		// Services.
		$order = 0;
		foreach ( Dadvar_Core_Layouts::services() as $slug => $service ) {
			++$order;
			$key = 'service_' . $slug;
			if ( self::find( $key ) ) {
				$report['skipped'][] = $key;
				continue;
			}
			$post_id = (int) wp_insert_post(
				array(
					'post_type'    => Dadvar_Core_Post_Types::SERVICE,
					'post_status'  => 'publish',
					'post_title'   => $service['title'],
					'post_name'    => $slug,
					'post_excerpt' => $service['excerpt'],
					'menu_order'   => $order,
					'meta_input'   => array( self::KEY_META => $key ),
				)
			);
			self::apply_layout( $post_id, Dadvar_Core_Layouts::service( $service, $ctx ), $report );
			$report['created'][] = $key;
		}

		// Articles.
		foreach ( Dadvar_Core_Layouts::articles() as $slug => $article ) {
			$key = 'post_' . $slug;
			if ( self::find( $key ) ) {
				$report['skipped'][] = $key;
				continue;
			}
			$term    = term_exists( $article['category'], 'category' );
			$term    = $term ? $term : wp_insert_term( $article['category'], 'category' );
			$post_id = (int) wp_insert_post(
				array(
					'post_type'     => 'post',
					'post_status'   => 'publish',
					'post_title'    => $article['title'],
					'post_name'     => $slug,
					'post_excerpt'  => $article['excerpt'],
					'post_content'  => $article['content'],
					'post_category' => is_wp_error( $term ) ? array() : array( (int) $term['term_id'] ),
					'meta_input'    => array( self::KEY_META => $key ),
				)
			);
			update_post_meta( $post_id, self::HASH_META, self::fingerprint( $post_id ) );
			$report['created'][] = $key;
		}

		// Page bodies (only for pages created in this run).
		$layouts = array(
			'page_home'    => array( 'Dadvar_Core_Layouts', 'home' ),
			'page_about'   => array( 'Dadvar_Core_Layouts', 'about' ),
			'page_contact' => array( 'Dadvar_Core_Layouts', 'contact' ),
		);
		foreach ( $pages as $key => $page ) {
			if ( empty( $ids[ $key . '__new' ] ) ) {
				continue;
			}
			if ( isset( $layouts[ $key ] ) ) {
				self::apply_layout( $ids[ $key ], call_user_func( $layouts[ $key ], $ctx ), $report );
			} else {
				wp_update_post(
					array(
						'ID'           => $ids[ $key ],
						'post_content' => self::text_page( $key ),
					)
				);
				update_post_meta( $ids[ $key ], self::HASH_META, self::fingerprint( $ids[ $key ] ) );
			}
			$report['created'][] = $key;
		}

		self::configure_site( $ids, $report );
		self::fill_empty_settings( $ids, $report );
		self::create_menus( $ids, $report );
		self::configure_elementor_kit( $report );
		flush_rewrite_rules();

		return $report;
	}

	/**
	 * Writes a layout to a post: through Elementor's Documents API when Elementor
	 * is active, otherwise as plain HTML with shortcodes.
	 *
	 * @param int   $post_id  Post ID.
	 * @param array $elements Element tree.
	 * @param array $report   Report (by reference).
	 */
	private static function apply_layout( $post_id, array $elements, array &$report ) {
		// Wrapped in an HTML block so the editor keeps it intact and wpautop() does not alter it.
		$html = "<!-- wp:html -->\n" . Dadvar_Core_Layout_Builder::to_html( $elements ) . "\n<!-- /wp:html -->";
		wp_update_post(
			array(
				'ID'           => $post_id,
				'post_content' => $html,
			)
		);

		if ( Dadvar_Core_Elementor::active() ) {
			$document = \Elementor\Plugin::$instance->documents->get( $post_id, false );
			if ( $document ) {
				$document->set_is_built_with_elementor( true );
				$saved = $document->save( array( 'elements' => $elements ) );
				if ( ! $saved ) {
					$report['warnings'][] = 'ذخیرهٔ المنتور برای «' . get_the_title( $post_id ) . '» انجام نشد (دسترسی کاربر فعلی را بررسی کنید).';
				}
			}
		}
		update_post_meta( $post_id, self::HASH_META, self::fingerprint( $post_id ) );
	}

	/**
	 * Body of simple text pages (privacy, legal notice, articles index).
	 *
	 * @param string $key Page key.
	 * @return string Block markup.
	 */
	private static function text_page( $key ) {
		$p      = function ( $text ) {
			return '<!-- wp:paragraph --><p>' . $text . '</p><!-- /wp:paragraph -->';
		};
		$h      = function ( $text ) {
			return '<!-- wp:heading --><h2 class="wp-block-heading">' . $text . '</h2><!-- /wp:heading -->';
		};
		$review = $p( '<strong>پیش‌نویس:</strong> این متن بر اساس امکانات فعلی سایت تهیه شده و پیش از انتشار باید با الزامات قانونی مرتبط و نظر وکیل تطبیق داده شود. این متن حکم یا تضمین حقوقی نیست.' );
		switch ( $key ) {
			case 'page_privacy':
				return $review
					. $h( 'چه اطلاعاتی جمع‌آوری می‌شود' )
					. $p( 'از طریق فرم درخواست مشاوره: نام، شمارهٔ تماس، ایمیل (اختیاری)، موضوع درخواست، زمان مناسب تماس و شرح کوتاه. این سایت به‌طور پیش‌فرض ابزار آمارگیری یا تبلیغاتی شخص ثالث ندارد و نقشه را جاسازی نمی‌کند.' )
					. $h( 'هدف استفاده' )
					. $p( 'این اطلاعات فقط برای تماس اولیه و هماهنگی جلسهٔ مشاوره استفاده می‌شود و ارسال فرم به معنای پذیرش وکالت نیست.' )
					. $h( 'مدت نگهداری' )
					. $p( 'درخواست‌ها در پایگاه دادهٔ سایت نگهداری و پس از مدت تعیین‌شده در تنظیمات دفتر (پیش‌فرض ۱۸۰ روز) خودکار حذف می‌شوند. نشانی IP به‌صورت خام ذخیره نمی‌شود.' )
					. $h( 'دسترسی و حذف' )
					. $p( 'برای دریافت یا حذف اطلاعاتی که از شما ثبت شده، از راه‌های تماس سایت درخواست دهید.' )
					. $h( 'کوکی‌ها' )
					. $p( 'سایت برای بازدیدکنندگان عادی کوکی ردیابی تنظیم نمی‌کند؛ کوکی‌های فنی وردپرس فقط برای کاربران واردشده به پیشخوان استفاده می‌شوند.' );
			case 'page_disclaimer':
				return $review
					. $p( 'مطالب این سایت جنبهٔ اطلاع‌رسانی و آموزش عمومی دارد و جایگزین مشاورهٔ حقوقی متناسب با شرایط هر پرونده نیست.' )
					. $p( 'ارسال فرم یا تماس با دفتر به‌تنهایی رابطهٔ وکیل و موکل ایجاد نمی‌کند. رابطهٔ وکالت فقط با قرارداد مکتوب برقرار می‌شود.' )
					. $p( 'نتیجهٔ رسیدگی قضایی به تصمیم مرجع رسیدگی بستگی دارد و قابل‌تضمین نیست.' );
			default:
				return '';
		}
	}

	/**
	 * Reading settings and privacy page — only when not yet configured.
	 *
	 * @param array $ids    Page IDs.
	 * @param array $report Report.
	 */
	private static function configure_site( array $ids, array &$report ) {
		if ( 'page' !== get_option( 'show_on_front' ) || ! get_option( 'page_on_front' ) ) {
			update_option( 'show_on_front', 'page' );
			update_option( 'page_on_front', $ids['page_home'] );
			update_option( 'page_for_posts', $ids['page_articles'] );
			$report['created'][] = 'reading_settings';
		} else {
			$report['skipped'][] = 'reading_settings';
		}
		$privacy = (int) get_option( 'wp_page_for_privacy_policy' );
		if ( ! $privacy || 'publish' !== get_post_status( $privacy ) ) {
			update_option( 'wp_page_for_privacy_policy', $ids['page_privacy'] );
		}
		if ( '/%postname%/' !== get_option( 'permalink_structure' ) && '' === get_option( 'permalink_structure' ) ) {
			update_option( 'permalink_structure', '/%postname%/' );
		}
		if ( 'open' === get_option( 'default_comment_status' ) ) {
			update_option( 'default_comment_status', 'closed' );
			$report['warnings'][] = 'دیدگاه‌ها برای نوشته‌های تازه بسته شد (برای سایت حقوقی پیشنهاد می‌شود). از «تنظیمات ← گفت‌وگو» قابل‌تغییر است.';
		}
	}

	/**
	 * Clearly-marked sample values, only for empty settings. Remembered so the
	 * admin is warned and structured data stays off until they are replaced.
	 *
	 * @param array $ids    Page IDs.
	 * @param array $report Report.
	 */
	private static function fill_empty_settings( array $ids, array &$report ) {
		$current = Dadvar_Core_Settings::get_all();
		$samples = array(
			'office_name' => 'دفتر وکالت (نام نمونه)',
			'city'        => 'تهران',
			'phone'       => '021-00000000',
			'address'     => '[نشانی نمونه — در تنظیمات دفتر جایگزین کنید]',
			'hours'       => "شنبه تا چهارشنبه: ۹ تا ۱۷\nپنجشنبه: با هماهنگی قبلی",
		);
		$filled  = array();
		foreach ( $samples as $key => $value ) {
			if ( '' === (string) $current[ $key ] ) {
				$current[ $key ] = $value;
				$filled[ $key ]  = $value;
			}
		}
		// A page setting counts as empty when the page it points to no longer exists.
		if ( ! $current['contact_page'] || 'publish' !== get_post_status( $current['contact_page'] ) ) {
			$current['contact_page'] = $ids['page_contact'];
		}
		if ( ! $current['privacy_page'] || 'publish' !== get_post_status( $current['privacy_page'] ) ) {
			$current['privacy_page'] = $ids['page_privacy'];
		}
		update_option( Dadvar_Core_Settings::OPTION, $current );
		Dadvar_Core_Settings::flush_cache();
		if ( $filled ) {
			update_option( self::SETTINGS_FLAG, array_merge( (array) get_option( self::SETTINGS_FLAG, array() ), $filled ), false );
			$report['warnings'][] = 'چند فیلد خالیِ اطلاعات دفتر با مقدار نمونه پر شد. تا جایگزینی آن‌ها، دادهٔ ساختاریافته خاموش می‌ماند.';
		}
	}

	/**
	 * Sample setting keys that still hold their sample value.
	 *
	 * @return string[]
	 */
	public static function remaining_sample_settings() {
		$samples = (array) get_option( self::SETTINGS_FLAG, array() );
		$left    = array();
		foreach ( $samples as $key => $value ) {
			if ( (string) dadvar_office( $key ) === (string) $value ) {
				$left[] = $key;
			}
		}
		return $left;
	}

	/**
	 * Admin warning while sample settings remain.
	 */
	public static function sample_settings_notice() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$left = self::remaining_sample_settings();
		if ( ! $left ) {
			return;
		}
		echo '<div class="notice notice-warning"><p>' . esc_html( 'اطلاعات دفتر هنوز مقدار نمونه دارد (' . count( $left ) . ' فیلد). پیش از انتشار عمومی، «دفتر وکالت ← اطلاعات دفتر» را با اطلاعات واقعی تکمیل کنید.' ) . ' <a href="' . esc_url( admin_url( 'admin.php?page=' . Dadvar_Core_Settings::PAGE ) ) . '">' . esc_html( 'ویرایش اطلاعات دفتر' ) . '</a></p></div>';
	}

	/**
	 * Suppresses structured data while sample values remain.
	 *
	 * @param array $data Schema data.
	 * @return array
	 */
	public static function block_schema_with_samples( $data ) {
		return self::remaining_sample_settings() ? array() : $data;
	}

	/**
	 * Creates menus only when the locations are empty.
	 *
	 * @param array $ids    Page IDs.
	 * @param array $report Report.
	 */
	private static function create_menus( array $ids, array &$report ) {
		$locations = get_theme_mod( 'nav_menu_locations', array() );
		$menus     = array(
			'primary' => array(
				'name'  => 'منوی اصلی',
				'items' => array(
					array( 'post', $ids['page_home'], 'خانه' ),
					array( 'archive', Dadvar_Core_Post_Types::SERVICE, 'خدمات' ),
					array( 'post', $ids['page_about'], 'دربارهٔ وکیل' ),
					array( 'post', $ids['page_articles'], 'مقالات' ),
					array( 'post', $ids['page_contact'], 'تماس' ),
				),
			),
			'footer'  => array(
				'name'  => 'منوی پابرگ',
				'items' => array(
					array( 'post', $ids['page_privacy'], 'حریم خصوصی' ),
					array( 'post', $ids['page_disclaimer'], 'توضیحات حقوقی' ),
					array( 'post', $ids['page_contact'], 'تماس' ),
				),
			),
		);
		foreach ( $menus as $location => $menu ) {
			if ( ! empty( $locations[ $location ] ) && is_nav_menu( $locations[ $location ] ) ) {
				$report['skipped'][] = 'menu_' . $location;
				continue;
			}
			$existing = wp_get_nav_menu_object( $menu['name'] );
			$menu_id  = $existing ? (int) $existing->term_id : (int) wp_create_nav_menu( $menu['name'] );
			if ( ! $existing ) {
				foreach ( $menu['items'] as $item ) {
					$args = array(
						'menu-item-title'  => $item[2],
						'menu-item-status' => 'publish',
					);
					if ( 'archive' === $item[0] ) {
						$args['menu-item-type']   = 'post_type_archive';
						$args['menu-item-object'] = $item[1];
					} else {
						$args['menu-item-type']      = 'post_type';
						$args['menu-item-object']    = 'page';
						$args['menu-item-object-id'] = $item[1];
					}
					wp_update_nav_menu_item( $menu_id, 0, $args );
				}
			}
			$locations[ $location ] = $menu_id;
			$report['created'][]    = 'menu_' . $location;
			if ( ! $existing ) {
				$created   = (array) get_option( 'dadvar_demo_menus', array() );
				$created[] = $menu_id;
				update_option( 'dadvar_demo_menus', array_values( array_unique( $created ) ), false );
			}
		}
		set_theme_mod( 'nav_menu_locations', $locations );
	}

	/**
	 * Design tokens in the active Elementor kit — only while the kit still has
	 * Elementor's factory colors (never overrides a customized kit).
	 *
	 * @param array $report Report.
	 */
	private static function configure_elementor_kit( array &$report ) {
		if ( ! Dadvar_Core_Elementor::active() ) {
			return;
		}
		$kit = \Elementor\Plugin::$instance->kits_manager->get_active_kit();
		if ( ! $kit || ! $kit->get_id() ) {
			$report['warnings'][] = 'کیت فعال المنتور پیدا نشد؛ رنگ‌ها و فونت‌ها تنظیم نشدند.';
			return;
		}
		$colors  = (array) $kit->get_settings( 'system_colors' );
		$primary = '';
		foreach ( $colors as $color ) {
			if ( isset( $color['_id'] ) && 'primary' === $color['_id'] ) {
				$primary = strtoupper( (string) $color['color'] );
			}
		}
		if ( '' !== $primary && '#6EC1E4' !== $primary && ! get_post_meta( $kit->get_id(), '_dadvar_tokens', true ) ) {
			$report['skipped'][] = 'elementor_kit (customized)';
			return;
		}
		$kit->update_settings( self::kit_settings() );
		update_post_meta( $kit->get_id(), '_dadvar_tokens', DADVAR_CORE_VERSION );
		\Elementor\Plugin::$instance->files_manager->clear_cache();
		$report['created'][] = 'elementor_kit';

		add_option( 'elementor_google_font', '0' );
		add_option( 'elementor_font_display', 'swap' );
	}

	/**
	 * The design tokens (also documented in ARCHITECTURE.md).
	 *
	 * @return array
	 */
	public static function kit_settings() {
		$typo = function ( $id, $title, $weight, $line_height ) {
			return array(
				'_id'                    => $id,
				'title'                  => $title,
				'typography_typography'  => 'custom',
				'typography_font_family' => 'Vazirmatn',
				'typography_font_weight' => $weight,
				'typography_line_height' => array(
					'unit' => 'em',
					'size' => $line_height,
				),
			);
		};
		return array(
			'system_colors'         => array(
				array(
					'_id'   => 'primary',
					'title' => 'اصلی (سرمه‌ای نفتی)',
					'color' => '#1E3A4A',
				),
				array(
					'_id'   => 'secondary',
					'title' => 'دوم (سبز دودی)',
					'color' => '#3D6670',
				),
				array(
					'_id'   => 'text',
					'title' => 'متن',
					'color' => '#1F262B',
				),
				array(
					'_id'   => 'accent',
					'title' => 'تأکید و دکمه (آجری)',
					'color' => '#A24A22',
				),
			),
			'custom_colors'         => array(
				array(
					'_id'   => 'dvsurface',
					'title' => 'زمینهٔ بخش‌ها',
					'color' => '#F6F4F0',
				),
				array(
					'_id'   => 'dvborder',
					'title' => 'خط و قاب',
					'color' => '#D9D4CB',
				),
				array(
					'_id'   => 'dvmuted',
					'title' => 'متن کم‌رنگ',
					'color' => '#4F5B63',
				),
			),
			'system_typography'     => array(
				$typo( 'primary', 'عنوان‌ها', '700', 1.5 ),
				$typo( 'secondary', 'عنوان‌های فرعی', '700', 1.6 ),
				$typo( 'text', 'متن', '400', 1.9 ),
				$typo( 'accent', 'دکمه‌ها', '700', 1.4 ),
			),
			'default_generic_fonts' => 'Tahoma, sans-serif',
			'container_width'       => array(
				'unit' => 'px',
				'size' => 1200,
			),
			'space_between_widgets' => array(
				'column'   => '20',
				'row'      => '20',
				'isLinked' => true,
				'unit'     => 'px',
				'size'     => 20,
			),
			'viewport_md'           => 768,
			'viewport_lg'           => 1025,
		);
	}

	/**
	 * Neutral placeholder portrait generated locally (no stock photo licences involved).
	 *
	 * @param array $report Report.
	 * @return int Attachment ID or 0.
	 */
	private static function placeholder_image( array &$report ) {
		$existing = self::find( 'image_placeholder' );
		if ( $existing ) {
			return $existing;
		}
		if ( ! function_exists( 'imagecreatetruecolor' ) || ! function_exists( 'imagejpeg' ) ) {
			$report['warnings'][] = 'کتابخانهٔ GD در دسترس نبود؛ تصویر جایگزین ساخته نشد.';
			return 0;
		}
		$width  = 800;
		$height = 1000;
		$image  = imagecreatetruecolor( $width, $height );
		for ( $y = 0; $y < $height; $y++ ) {
			$mix   = $y / $height;
			$color = imagecolorallocate( $image, (int) ( 230 - 40 * $mix ), (int) ( 226 - 36 * $mix ), (int) ( 218 - 30 * $mix ) );
			imageline( $image, 0, $y, $width, $y, $color );
		}
		$shape = imagecolorallocate( $image, 160, 156, 148 );
		imagefilledellipse( $image, 400, 380, 260, 300, $shape );
		imagefilledellipse( $image, 400, 900, 560, 520, $shape );
		ob_start();
		imagejpeg( $image, null, 78 );
		$bytes = ob_get_clean();
		imagedestroy( $image );

		$upload = wp_upload_bits( 'dadvar-placeholder-portrait.jpg', null, $bytes );
		if ( ! empty( $upload['error'] ) ) {
			$report['warnings'][] = 'ذخیرهٔ تصویر جایگزین ناموفق بود: ' . $upload['error'];
			return 0;
		}
		$attachment_id = wp_insert_attachment(
			array(
				'post_mime_type' => 'image/jpeg',
				'post_title'     => 'تصویر جایگزین وکیل (نمونه)',
				'post_status'    => 'inherit',
				'meta_input'     => array(
					self::KEY_META             => 'image_placeholder',
					'_wp_attachment_image_alt' => 'تصویر جایگزین؛ عکس واقعی وکیل را جایگزین کنید',
				),
			),
			$upload['file']
		);
		require_once ABSPATH . 'wp-admin/includes/image.php';
		wp_update_attachment_metadata( $attachment_id, wp_generate_attachment_metadata( $attachment_id, $upload['file'] ) );
		return (int) $attachment_id;
	}

	/**
	 * Deletes sample items that are unchanged since import.
	 *
	 * @return array { deleted: string[], kept: string[] }
	 */
	public static function remove() {
		$result = array(
			'deleted' => array(),
			'kept'    => array(),
		);
		$ids    = get_posts(
			array(
				'post_type'      => 'any',
				'post_status'    => 'any',
				'fields'         => 'ids',
				'posts_per_page' => 200, // phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_posts_per_page -- admin tool, bounded sample set.
				'no_found_rows'  => true,
				'meta_key'       => self::KEY_META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key -- admin-only tool.
			)
		);
		// Menus created by the importer are removed together with the sample pages they link to.
		foreach ( (array) get_option( 'dadvar_demo_menus', array() ) as $menu_id ) {
			if ( is_nav_menu( (int) $menu_id ) ) {
				wp_delete_nav_menu( (int) $menu_id );
				$result['deleted'][] = 'menu_' . (int) $menu_id;
			}
		}
		delete_option( 'dadvar_demo_menus' );

		foreach ( $ids as $id ) {
			$key  = (string) get_post_meta( $id, self::KEY_META, true );
			$hash = (string) get_post_meta( $id, self::HASH_META, true );
			if ( 'attachment' === get_post_type( $id ) ) {
				continue;
			}
			if ( $hash && self::fingerprint( $id ) === $hash ) {
				wp_delete_post( $id, true );
				$result['deleted'][] = $key;
			} else {
				$result['kept'][] = $key;
			}
		}
		return $result;
	}
}

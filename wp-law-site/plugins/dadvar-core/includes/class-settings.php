<?php
/**
 * Office settings: the single source for contact data, identity and form options.
 *
 * Stored in one option (`dadvar_office`). Theme, widgets, schema and emails all read from here.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Settings page under «دفتر وکالت».
 */
final class Dadvar_Core_Settings {

	const OPTION     = 'dadvar_office';
	const PAGE       = 'dadvar-office';
	const CAPABILITY = 'manage_options';

	/**
	 * Request-level cache.
	 *
	 * @var array|null
	 */
	private static $cache = null;

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
		add_action( 'update_option_' . self::OPTION, array( __CLASS__, 'flush_cache' ) );
		add_action( 'add_option_' . self::OPTION, array( __CLASS__, 'flush_cache' ) );
	}

	/**
	 * Field definitions grouped by section.
	 *
	 * @return array
	 */
	public static function fields() {
		return array(
			'identity' => array(
				'title'  => 'هویت دفتر و وکیل',
				'desc'   => 'فقط اطلاعات واقعی و قابل‌استناد وارد کنید. این داده‌ها در سایت و داده‌های ساختاریافتهٔ موتور جست‌وجو نمایش داده می‌شوند.',
				'fields' => array(
					'office_name'        => array(
						'label' => 'نام دفتر یا وکیل',
						'type'  => 'text',
					),
					'lawyer_name'        => array(
						'label' => 'نام کامل وکیل',
						'type'  => 'text',
					),
					'professional_title' => array(
						'label' => 'عنوان حرفه‌ای',
						'type'  => 'text',
						'help'  => 'مثلاً «وکیل پایه‌یک دادگستری». فقط عنوان رسمی و واقعی.',
					),
					'license_number'     => array(
						'label' => 'شمارهٔ پروانهٔ وکالت',
						'type'  => 'text',
						'help'  => 'خالی بماند تا زمانی که شمارهٔ واقعی را وارد کنید؛ در این صورت نمایش داده نمی‌شود.',
					),
					'bar_association'    => array(
						'label' => 'کانون یا مرجع صدور پروانه',
						'type'  => 'text',
					),
					'service_area'       => array(
						'label' => 'حوزهٔ جغرافیایی فعالیت',
						'type'  => 'text',
						'help'  => 'مثلاً «تهران و استان البرز».',
					),
					'multi_member'       => array(
						'label' => 'دفتر چندعضوی است',
						'type'  => 'checkbox',
						'help'  => 'فقط اگر دفتر بیش از یک وکیل دارد فعال کنید؛ بخش «اعضا» در پیشخوان ظاهر می‌شود.',
					),
				),
			),
			'contact'  => array(
				'title'  => 'اطلاعات تماس',
				'desc'   => 'هر جای سایت که شماره، آدرس یا ساعات کاری نمایش داده می‌شود از همین‌جا خوانده می‌شود.',
				'fields' => array(
					'phone'        => array(
						'label' => 'تلفن ثابت',
						'type'  => 'tel',
					),
					'mobile'       => array(
						'label' => 'تلفن همراه',
						'type'  => 'tel',
					),
					'email'        => array(
						'label' => 'ایمیل عمومی',
						'type'  => 'email',
					),
					'address'      => array(
						'label' => 'نشانی دفتر',
						'type'  => 'textarea',
					),
					'city'         => array(
						'label' => 'شهر',
						'type'  => 'text',
					),
					'postal_code'  => array(
						'label' => 'کد پستی',
						'type'  => 'text',
					),
					'map_url'      => array(
						'label' => 'پیوند مسیریابی (نشان، بلد یا گوگل)',
						'type'  => 'url',
						'help'  => 'نقشه جاسازی نمی‌شود؛ فقط پیوند مسیریابی نمایش داده می‌شود (سریع‌تر و بدون ردیابی).',
					),
					'hours'        => array(
						'label' => 'ساعات کاری',
						'type'  => 'textarea',
						'help'  => 'هر خط یک بازه، مثلاً «شنبه تا چهارشنبه: ۹ تا ۱۷».',
					),
					'contact_page' => array(
						'label' => 'برگهٔ تماس و درخواست مشاوره',
						'type'  => 'page',
					),
				),
			),
			'social'   => array(
				'title'  => 'شبکه‌های اجتماعی',
				'desc'   => 'فقط نشانی کامل صفحه‌های رسمی. موارد خالی نمایش داده نمی‌شوند.',
				'fields' => array(
					'social_instagram' => array(
						'label' => 'اینستاگرام',
						'type'  => 'url',
					),
					'social_telegram'  => array(
						'label' => 'تلگرام',
						'type'  => 'url',
					),
					'social_whatsapp'  => array(
						'label' => 'واتس‌اپ',
						'type'  => 'url',
					),
					'social_linkedin'  => array(
						'label' => 'لینکدین',
						'type'  => 'url',
					),
					'social_x'         => array(
						'label' => 'ایکس',
						'type'  => 'url',
					),
					'social_eitaa'     => array(
						'label' => 'ایتا',
						'type'  => 'url',
					),
					'social_bale'      => array(
						'label' => 'بله',
						'type'  => 'url',
					),
				),
			),
			'form'     => array(
				'title'  => 'فرم درخواست مشاوره',
				'desc'   => 'درخواست‌ها در پیشخوان (منوی «درخواست‌ها») ذخیره می‌شوند و یک ایمیل اطلاع‌رسانی ارسال می‌شود.',
				'fields' => array(
					'notify_email'       => array(
						'label' => 'ایمیل دریافت اعلان',
						'type'  => 'email',
						'help'  => 'خالی = ایمیل مدیر سایت.',
					),
					'email_include_body' => array(
						'label' => 'متن پیام در ایمیل اعلان هم بیاید',
						'type'  => 'checkbox',
						'help'  => 'پیش‌فرض خاموش: ایمیل فقط نام، تلفن و موضوع را دارد و متن کامل در پیشخوان می‌ماند.',
					),
					'retention_days'     => array(
						'label' => 'مدت نگهداری درخواست‌ها (روز)',
						'type'  => 'int',
						'min'   => 0,
						'max'   => 3650,
						'help'  => 'درخواست‌های قدیمی‌تر روزانه خودکار حذف می‌شوند. صفر = حذف خودکار خاموش.',
					),
					'privacy_page'       => array(
						'label' => 'برگهٔ حریم خصوصی',
						'type'  => 'page',
						'help'  => 'در کادر رضایت فرم پیوند داده می‌شود. خالی = برگهٔ حریم خصوصی وردپرس.',
					),
				),
			),
			'seo'      => array(
				'title'  => 'سئو',
				'desc'   => 'عنوان، توضیحات، نقشهٔ سایت و نشانی اصلی را افزونهٔ سئو (در صورت نصب) یا خود وردپرس مدیریت می‌کند.',
				'fields' => array(
					'schema_enabled' => array(
						'label' => 'دادهٔ ساختاریافتهٔ «خدمات حقوقی» در صفحهٔ اصلی',
						'type'  => 'checkbox',
						'help'  => 'فقط از فیلدهای پرشدهٔ همین صفحه ساخته می‌شود.',
					),
				),
			),
		);
	}

	/**
	 * Default values.
	 *
	 * @return array
	 */
	public static function defaults() {
		$defaults = array();
		foreach ( self::fields() as $section ) {
			foreach ( $section['fields'] as $key => $field ) {
				$defaults[ $key ] = 'checkbox' === $field['type'] ? 0 : '';
			}
		}
		$defaults['retention_days'] = 180;
		$defaults['schema_enabled'] = 1;
		return $defaults;
	}

	/**
	 * All values merged with defaults.
	 *
	 * @return array
	 */
	public static function get_all() {
		if ( null === self::$cache ) {
			$stored      = get_option( self::OPTION, array() );
			self::$cache = wp_parse_args( is_array( $stored ) ? $stored : array(), self::defaults() );
		}
		return self::$cache;
	}

	/**
	 * Clears the request cache after a save.
	 */
	public static function flush_cache() {
		self::$cache = null;
	}

	/**
	 * Adds the top-level menu.
	 */
	public static function menu() {
		add_menu_page(
			'اطلاعات دفتر',
			'دفتر وکالت',
			self::CAPABILITY,
			self::PAGE,
			array( __CLASS__, 'render_page' ),
			'dashicons-building',
			3
		);
		add_submenu_page( self::PAGE, 'اطلاعات دفتر', 'اطلاعات دفتر', self::CAPABILITY, self::PAGE, array( __CLASS__, 'render_page' ) );
	}

	/**
	 * Registers the option, sections and fields with the Settings API.
	 */
	public static function register() {
		register_setting(
			'dadvar_office_group',
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'default'           => self::defaults(),
				'show_in_rest'      => false,
			)
		);

		foreach ( self::fields() as $section_id => $section ) {
			add_settings_section(
				'dadvar_' . $section_id,
				$section['title'],
				function () use ( $section ) {
					echo '<p>' . esc_html( $section['desc'] ) . '</p>';
				},
				self::PAGE
			);
			foreach ( $section['fields'] as $key => $field ) {
				add_settings_field(
					$key,
					$field['label'],
					array( __CLASS__, 'render_field' ),
					self::PAGE,
					'dadvar_' . $section_id,
					array(
						'key'       => $key,
						'field'     => $field,
						'label_for' => 'dadvar_' . $key,
					)
				);
			}
		}
	}

	/**
	 * Sanitizes the whole option on save.
	 *
	 * @param mixed $input Raw input.
	 * @return array
	 */
	public static function sanitize( $input ) {
		$input  = is_array( $input ) ? $input : array();
		$output = self::defaults();

		foreach ( self::fields() as $section ) {
			foreach ( $section['fields'] as $key => $field ) {
				$raw = isset( $input[ $key ] ) ? wp_unslash( $input[ $key ] ) : '';
				switch ( $field['type'] ) {
					case 'checkbox':
						$output[ $key ] = empty( $raw ) ? 0 : 1;
						break;
					case 'email':
						$output[ $key ] = sanitize_email( $raw );
						break;
					case 'url':
						$output[ $key ] = esc_url_raw( trim( $raw ), array( 'http', 'https' ) );
						break;
					case 'textarea':
						$output[ $key ] = sanitize_textarea_field( $raw );
						break;
					case 'int':
						$value          = (int) dadvar_latin_digits( $raw );
						$output[ $key ] = max( $field['min'], min( $field['max'], $value ) );
						break;
					case 'page':
						$page_id        = absint( $raw );
						$output[ $key ] = ( $page_id && 'page' === get_post_type( $page_id ) ) ? $page_id : 0;
						break;
					case 'tel':
						$output[ $key ] = preg_replace( '/[^0-9۰-۹٠-٩+\-\s()]/u', '', sanitize_text_field( $raw ) );
						break;
					default:
						$output[ $key ] = sanitize_text_field( $raw );
				}
			}
		}

		if ( empty( $input['multi_member'] ) !== empty( self::get_all()['multi_member'] ) ) {
			// Member post type appears/disappears: refresh permalinks on next load.
			update_option( 'dadvar_flush_rewrite', 1 );
		}

		return $output;
	}

	/**
	 * Renders one field.
	 *
	 * @param array $args Field args.
	 */
	public static function render_field( $args ) {
		$key   = $args['key'];
		$field = $args['field'];
		$value = self::get_all()[ $key ];
		$name  = self::OPTION . '[' . $key . ']';
		$id    = 'dadvar_' . $key;

		switch ( $field['type'] ) {
			case 'checkbox':
				printf(
					'<input type="checkbox" id="%1$s" name="%2$s" value="1" %3$s>',
					esc_attr( $id ),
					esc_attr( $name ),
					checked( 1, (int) $value, false )
				);
				break;
			case 'textarea':
				printf(
					'<textarea id="%1$s" name="%2$s" rows="3" class="large-text">%3$s</textarea>',
					esc_attr( $id ),
					esc_attr( $name ),
					esc_textarea( $value )
				);
				break;
			case 'page':
				wp_dropdown_pages(
					array(
						'name'              => esc_attr( $name ),
						'id'                => esc_attr( $id ),
						'selected'          => (int) $value,
						'show_option_none'  => '— انتخاب نشده —',
						'option_none_value' => '0',
					)
				);
				break;
			case 'int':
				printf(
					'<input type="number" id="%1$s" name="%2$s" value="%3$s" min="%4$d" max="%5$d" class="small-text">',
					esc_attr( $id ),
					esc_attr( $name ),
					esc_attr( $value ),
					(int) $field['min'],
					(int) $field['max']
				);
				break;
			default:
				$type = in_array( $field['type'], array( 'email', 'url', 'tel' ), true ) ? $field['type'] : 'text';
				$dir  = in_array( $field['type'], array( 'email', 'url', 'tel' ), true ) ? ' dir="ltr"' : '';
				printf(
					'<input type="%1$s" id="%2$s" name="%3$s" value="%4$s" class="regular-text"%5$s>',
					esc_attr( $type ),
					esc_attr( $id ),
					esc_attr( $name ),
					esc_attr( $value ),
					$dir // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static string.
				);
		}

		if ( ! empty( $field['help'] ) ) {
			echo '<p class="description">' . esc_html( $field['help'] ) . '</p>';
		}
	}

	/**
	 * Renders the settings page.
	 */
	public static function render_page() {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			return;
		}
		echo '<div class="wrap"><h1>' . esc_html( get_admin_page_title() ) . '</h1>';
		echo '<p>' . esc_html( 'این صفحه منبع واحد اطلاعات تماس و هویت دفتر است. سربرگ، پابرگ، ابزارک‌های المنتور و فرم‌ها همه از همین‌جا می‌خوانند.' ) . '</p>';
		echo '<form action="options.php" method="post">';
		settings_fields( 'dadvar_office_group' );
		do_settings_sections( self::PAGE );
		submit_button( 'ذخیرهٔ تغییرات' );
		echo '</form></div>';
	}
}

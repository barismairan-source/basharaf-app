<?php
/**
 * Consultation request form: rendering, validation, spam protection, delivery.
 *
 * One handler serves both the JavaScript (REST) path and the no-JavaScript
 * (admin-post.php) path, so rules can never drift apart.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Consultation form.
 */
final class Dadvar_Core_Form {

	const REST_NS        = 'dadvar/v1';
	const ACTION         = 'dadvar_inquiry';
	const MESSAGE_MAX    = 500;
	const TOKEN_MIN_AGE  = 3;
	const TOKEN_MAX_AGE  = 7 * DAY_IN_SECONDS;
	const RATE_LIMIT     = 5;
	const RATE_WINDOW    = HOUR_IN_SECONDS;
	const DUPLICATE_SPAN = 15 * MINUTE_IN_SECONDS;

	/**
	 * HTML id of the form being rendered (prefix for field ids).
	 *
	 * @var string
	 */
	private static $form_id = 'dadvar-form';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_assets' ) );
		add_action( 'init', array( __CLASS__, 'register_shortcode' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		add_action( 'admin_post_nopriv_' . self::ACTION, array( __CLASS__, 'handle_post' ) );
		add_action( 'admin_post_' . self::ACTION, array( __CLASS__, 'handle_post' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'maybe_enqueue_for_shortcode' ) );
	}

	/**
	 * Registers (does not enqueue) form assets. They load only where a form is rendered.
	 */
	public static function register_assets() {
		wp_register_style( 'dadvar-form', DADVAR_CORE_URL . 'assets/css/form.css', array(), DADVAR_CORE_VERSION );
		wp_register_script(
			'dadvar-form',
			DADVAR_CORE_URL . 'assets/js/form.js',
			array(),
			DADVAR_CORE_VERSION,
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);
		wp_localize_script(
			'dadvar-form',
			'dadvarForm',
			array(
				'endpoint' => esc_url_raw( rest_url( self::REST_NS . '/inquiry' ) ),
				'tokenUrl' => esc_url_raw( rest_url( self::REST_NS . '/form-token' ) ),
				'messages' => array(
					'sending'  => 'در حال ارسال…',
					'network'  => 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره بفرستید، یا تماس تلفنی بگیرید.',
					'invalid'  => 'لطفاً موارد مشخص‌شده را اصلاح کنید.',
					'required' => 'این مورد را کامل کنید.',
					'phone'    => 'شمارهٔ تماس معتبر نیست؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷.',
					'email'    => 'نشانی ایمیل معتبر نیست.',
					'consent'  => 'برای ارسال، تأیید مطالعهٔ حریم خصوصی لازم است.',
					'tooLong'  => 'متن طولانی‌تر از حد مجاز است.',
				),
			)
		);
	}

	/**
	 * Shortcode for sites/pages that do not use Elementor.
	 */
	public static function register_shortcode() {
		add_shortcode(
			'dadvar_consultation_form',
			function ( $atts ) {
				$atts = shortcode_atts(
					array(
						'submit'  => 'ارسال درخواست',
						'success' => '',
					),
					$atts,
					'dadvar_consultation_form'
				);
				return self::render( $atts );
			}
		);
	}

	/**
	 * Enqueues CSS in <head> when the current singular content contains the shortcode.
	 */
	public static function maybe_enqueue_for_shortcode() {
		if ( is_singular() && has_shortcode( (string) get_post_field( 'post_content', get_queried_object_id() ), 'dadvar_consultation_form' ) ) {
			wp_enqueue_style( 'dadvar-form' );
		}
	}

	/**
	 * Allowed topic values (service titles + «سایر»).
	 *
	 * @return string[]
	 */
	public static function topics() {
		$topics = array();
		foreach ( Dadvar_Core_Post_Types::services() as $service ) {
			$label    = get_post_meta( $service->ID, 'dadvar_short_label', true );
			$topics[] = $label ? $label : $service->post_title;
		}
		$topics[] = 'سایر موضوعات';
		return array_values( array_unique( $topics ) );
	}

	/**
	 * Preferred contact time options.
	 *
	 * @return string[]
	 */
	public static function times() {
		return array( 'فرقی نمی‌کند', 'صبح', 'بعدازظهر' );
	}

	/**
	 * Creates a time-stamped, signed token (cache-safe anti-bot check, not a CSRF nonce:
	 * the form is public and anonymous, so there is no session to protect).
	 *
	 * @param int|null $time Issue time.
	 * @return string
	 */
	public static function token( $time = null ) {
		$time = null === $time ? time() : (int) $time;
		return $time . '.' . substr( wp_hash( 'dadvar-form|' . $time, 'nonce' ), 0, 20 );
	}

	/**
	 * Validates a token's signature and age.
	 *
	 * @param string $token Token.
	 * @return string Empty string when valid, otherwise an error code.
	 */
	public static function check_token( $token ) {
		$parts = explode( '.', (string) $token );
		if ( 2 !== count( $parts ) || ! ctype_digit( $parts[0] ) ) {
			return 'token';
		}
		if ( ! hash_equals( self::token( (int) $parts[0] ), (string) $token ) ) {
			return 'token';
		}
		$age = time() - (int) $parts[0];
		if ( $age < self::TOKEN_MIN_AGE ) {
			return 'too_fast';
		}
		if ( $age > self::TOKEN_MAX_AGE ) {
			return 'expired';
		}
		return '';
	}

	/**
	 * Renders the form.
	 *
	 * @param array $args { submit, success, id }.
	 * @return string HTML.
	 */
	public static function render( $args = array() ) {
		$args = wp_parse_args(
			$args,
			array(
				'submit'  => 'ارسال درخواست',
				'success' => '',
				'id'      => 'dadvar-form',
			)
		);
		wp_enqueue_style( 'dadvar-form' );
		wp_enqueue_script( 'dadvar-form' );

		$state   = self::read_redirect_state();
		$errors  = $state['errors'];
		$old     = $state['values'];
		$success = $args['success'] ? $args['success'] : 'درخواست شما ثبت شد. در اولین فرصت کاری برای هماهنگی تماس می‌گیریم.';
		$id      = sanitize_html_class( $args['id'] );

		self::$form_id = $id;

		$privacy_id  = (int) dadvar_office( 'privacy_page', 0 );
		$privacy_url = $privacy_id ? get_permalink( $privacy_id ) : get_privacy_policy_url();

		ob_start();
		?>
		<form id="<?php echo esc_attr( $id ); ?>" class="dv-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" novalidate data-dv-form data-success="<?php echo esc_attr( $success ); ?>">
			<input type="hidden" name="action" value="<?php echo esc_attr( self::ACTION ); ?>">
			<input type="hidden" name="dv_token" value="<?php echo esc_attr( self::token() ); ?>">
			<input type="hidden" name="dv_source" value="<?php echo esc_attr( self::current_path() ); ?>">

			<div class="dv-form__status" role="status" aria-live="polite" tabindex="-1" data-dv-status>
				<?php
				if ( 'sent' === $state['result'] ) {
					echo '<p class="dv-form__notice dv-form__notice--success">' . esc_html( $success ) . '</p>';
				} elseif ( ! empty( $state['general'] ) ) {
					echo '<p class="dv-form__notice dv-form__notice--error">' . esc_html( $state['general'] ) . '</p>';
				}
				?>
			</div>

			<div class="dv-form__grid">
				<?php
				self::field_input(
					'dv_name',
					'نام و نام خانوادگی',
					'text',
					true,
					$old,
					$errors,
					array(
						'autocomplete' => 'name',
						'maxlength'    => 80,
					)
				);
				self::field_input(
					'dv_phone',
					'شمارهٔ تماس',
					'tel',
					true,
					$old,
					$errors,
					array(
						'autocomplete' => 'tel',
						'inputmode'    => 'tel',
						'dir'          => 'ltr',
						'maxlength'    => 20,
					),
					'برای هماهنگی، با همین شماره تماس می‌گیریم.'
				);
				self::field_input(
					'dv_email',
					'ایمیل (اختیاری)',
					'email',
					false,
					$old,
					$errors,
					array(
						'autocomplete' => 'email',
						'dir'          => 'ltr',
						'maxlength'    => 100,
					)
				);
				self::field_select( 'dv_topic', 'موضوع درخواست', self::topics(), true, $old, $errors );
				self::field_select( 'dv_time', 'زمان مناسب برای تماس', self::times(), false, $old, $errors );
				?>
				<div class="dv-field dv-field--wide<?php echo isset( $errors['dv_message'] ) ? ' is-invalid' : ''; ?>">
					<label for="<?php echo esc_attr( $id ); ?>-dv_message">شرح کوتاه (اختیاری)</label>
					<p class="dv-field__help" id="<?php echo esc_attr( $id ); ?>-dv_message-help">در حد چند جمله بنویسید. لطفاً جزئیات محرمانه یا مدارک پرونده را این‌جا وارد نکنید؛ در گفت‌وگوی تلفنی بررسی می‌شود.</p>
					<textarea id="<?php echo esc_attr( $id ); ?>-dv_message" name="dv_message" rows="4" maxlength="<?php echo (int) self::MESSAGE_MAX; ?>" aria-describedby="<?php echo esc_attr( $id ); ?>-dv_message-help <?php echo esc_attr( $id ); ?>-dv_message-error"<?php echo isset( $errors['dv_message'] ) ? ' aria-invalid="true"' : ''; ?>><?php echo esc_textarea( isset( $old['dv_message'] ) ? $old['dv_message'] : '' ); ?></textarea>
					<p class="dv-field__error" id="<?php echo esc_attr( $id ); ?>-dv_message-error" data-dv-error><?php echo isset( $errors['dv_message'] ) ? esc_html( $errors['dv_message'] ) : ''; ?></p>
				</div>
			</div>

			<div class="dv-field dv-field--check<?php echo isset( $errors['dv_consent'] ) ? ' is-invalid' : ''; ?>">
				<input type="checkbox" id="<?php echo esc_attr( $id ); ?>-dv_consent" name="dv_consent" value="1" required aria-describedby="<?php echo esc_attr( $id ); ?>-dv_consent-error"<?php echo isset( $errors['dv_consent'] ) ? ' aria-invalid="true"' : ''; ?>>
				<label for="<?php echo esc_attr( $id ); ?>-dv_consent">
					<?php if ( $privacy_url ) : ?>
						<a href="<?php echo esc_url( $privacy_url ); ?>" target="_blank" rel="noopener">سیاست حریم خصوصی</a> را خواندم و با تماس برای پیگیری این درخواست موافقم.
					<?php else : ?>
						با ذخیرهٔ این اطلاعات و تماس برای پیگیری این درخواست موافقم.
					<?php endif; ?>
				</label>
				<p class="dv-field__error" id="<?php echo esc_attr( $id ); ?>-dv_consent-error" data-dv-error><?php echo isset( $errors['dv_consent'] ) ? esc_html( $errors['dv_consent'] ) : ''; ?></p>
			</div>

			<div class="dv-form__hp" aria-hidden="true">
				<label for="<?php echo esc_attr( $id ); ?>-dv_website">وب‌سایت</label>
				<input type="text" id="<?php echo esc_attr( $id ); ?>-dv_website" name="dv_website" tabindex="-1" autocomplete="off">
			</div>

			<p class="dv-form__note">ارسال این فرم به معنای پذیرش وکالت یا ارائهٔ مشاورهٔ حقوقی نیست.</p>
			<button type="submit" class="dv-button dv-form__submit"><?php echo esc_html( $args['submit'] ); ?></button>
		</form>
		<?php
		return (string) ob_get_clean();
	}

	/**
	 * Renders a text-like input.
	 *
	 * @param string $name     Field name.
	 * @param string $label    Label.
	 * @param string $type     Input type.
	 * @param bool   $required Required.
	 * @param array  $old      Previous values.
	 * @param array  $errors   Errors.
	 * @param array  $attrs    Extra attributes.
	 * @param string $help     Help text.
	 */
	private static function field_input( $name, $label, $type, $required, $old, $errors, $attrs = array(), $help = '' ) {
		$id       = self::$form_id . '-' . $name;
		$describe = array();
		if ( $help ) {
			$describe[] = $id . '-help';
		}
		$describe[] = $id . '-error';
		$attr_html  = '';
		foreach ( $attrs as $key => $value ) {
			$attr_html .= ' ' . esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
		}
		?>
		<div class="dv-field<?php echo isset( $errors[ $name ] ) ? ' is-invalid' : ''; ?>">
			<label for="<?php echo esc_attr( $id ); ?>"><?php echo esc_html( $label ); ?><?php echo $required ? ' <span class="dv-field__req" aria-hidden="true">*</span>' : ''; ?></label>
			<?php if ( $help ) : ?>
				<p class="dv-field__help" id="<?php echo esc_attr( $id ); ?>-help"><?php echo esc_html( $help ); ?></p>
			<?php endif; ?>
			<input type="<?php echo esc_attr( $type ); ?>" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $name ); ?>" value="<?php echo esc_attr( isset( $old[ $name ] ) ? $old[ $name ] : '' ); ?>" aria-describedby="<?php echo esc_attr( implode( ' ', $describe ) ); ?>"<?php echo $required ? ' required' : ''; ?><?php echo isset( $errors[ $name ] ) ? ' aria-invalid="true"' : ''; ?><?php echo $attr_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>>
			<p class="dv-field__error" id="<?php echo esc_attr( $id ); ?>-error" data-dv-error><?php echo isset( $errors[ $name ] ) ? esc_html( $errors[ $name ] ) : ''; ?></p>
		</div>
		<?php
	}

	/**
	 * Renders a select.
	 *
	 * @param string   $name     Field name.
	 * @param string   $label    Label.
	 * @param string[] $options  Options.
	 * @param bool     $required Required.
	 * @param array    $old      Previous values.
	 * @param array    $errors   Errors.
	 */
	private static function field_select( $name, $label, $options, $required, $old, $errors ) {
		$id      = self::$form_id . '-' . $name;
		$current = isset( $old[ $name ] ) ? $old[ $name ] : '';
		?>
		<div class="dv-field<?php echo isset( $errors[ $name ] ) ? ' is-invalid' : ''; ?>">
			<label for="<?php echo esc_attr( $id ); ?>"><?php echo esc_html( $label ); ?><?php echo $required ? ' <span class="dv-field__req" aria-hidden="true">*</span>' : ''; ?></label>
			<select id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $name ); ?>" aria-describedby="<?php echo esc_attr( $id ); ?>-error"<?php echo $required ? ' required' : ''; ?><?php echo isset( $errors[ $name ] ) ? ' aria-invalid="true"' : ''; ?>>
				<?php if ( $required ) : ?>
					<option value="">انتخاب کنید</option>
				<?php endif; ?>
				<?php foreach ( $options as $option ) : ?>
					<option value="<?php echo esc_attr( $option ); ?>" <?php selected( $current, $option ); ?>><?php echo esc_html( $option ); ?></option>
				<?php endforeach; ?>
			</select>
			<p class="dv-field__error" id="<?php echo esc_attr( $id ); ?>-error" data-dv-error><?php echo isset( $errors[ $name ] ) ? esc_html( $errors[ $name ] ) : ''; ?></p>
		</div>
		<?php
	}

	/**
	 * Current request path (stored with the request so the manager knows which page sent it).
	 *
	 * @return string
	 */
	private static function current_path() {
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '/';
		return (string) strtok( $uri, '?' );
	}

	/**
	 * Validates and normalizes raw input.
	 *
	 * @param array $raw Unslashed request data.
	 * @return array { data: array, errors: array }
	 */
	public static function validate( array $raw ) {
		$errors = array();
		$get    = function ( $key ) use ( $raw ) {
			return isset( $raw[ $key ] ) && is_scalar( $raw[ $key ] ) ? trim( (string) $raw[ $key ] ) : '';
		};

		$name = sanitize_text_field( $get( 'dv_name' ) );
		$len  = mb_strlen( $name );
		if ( 0 === $len ) {
			$errors['dv_name'] = 'نام را وارد کنید.';
		} elseif ( $len < 2 || $len > 80 ) {
			$errors['dv_name'] = 'نام باید بین ۲ تا ۸۰ نویسه باشد.';
		}

		$phone_raw = sanitize_text_field( $get( 'dv_phone' ) );
		$phone     = self::normalize_phone( $phone_raw );
		if ( '' === $phone_raw ) {
			$errors['dv_phone'] = 'شمارهٔ تماس را وارد کنید.';
		} elseif ( '' === $phone ) {
			$errors['dv_phone'] = 'شمارهٔ تماس معتبر نیست؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷.';
		}

		$email = sanitize_text_field( $get( 'dv_email' ) );
		if ( '' !== $email && ! is_email( $email ) ) {
			$errors['dv_email'] = 'نشانی ایمیل معتبر نیست.';
		}

		$topic = sanitize_text_field( $get( 'dv_topic' ) );
		if ( '' === $topic ) {
			$errors['dv_topic'] = 'موضوع را انتخاب کنید.';
		} elseif ( ! in_array( $topic, self::topics(), true ) ) {
			$errors['dv_topic'] = 'موضوع انتخاب‌شده معتبر نیست.';
		}

		$time = sanitize_text_field( $get( 'dv_time' ) );
		if ( '' !== $time && ! in_array( $time, self::times(), true ) ) {
			$time = '';
		}

		$message = sanitize_textarea_field( $get( 'dv_message' ) );
		if ( mb_strlen( $message ) > self::MESSAGE_MAX ) {
			$errors['dv_message'] = 'شرح کوتاه حداکثر ' . dadvar_fa_digits( self::MESSAGE_MAX ) . ' نویسه است.';
		}

		if ( '1' !== $get( 'dv_consent' ) ) {
			$errors['dv_consent'] = 'برای ارسال، تأیید مطالعهٔ حریم خصوصی لازم است.';
		}

		return array(
			'data'   => array(
				'name'    => $name,
				'phone'   => $phone,
				'email'   => $email,
				'topic'   => $topic,
				'time'    => $time,
				'message' => $message,
				'source'  => mb_substr( sanitize_text_field( $get( 'dv_source' ) ), 0, 200 ),
			),
			'errors' => $errors,
		);
	}

	/**
	 * Normalizes a phone number (Persian/Arabic digits, spaces, dashes, +98).
	 *
	 * @param string $phone Raw phone.
	 * @return string Normalized phone, or empty string when invalid.
	 */
	public static function normalize_phone( $phone ) {
		$phone = dadvar_latin_digits( $phone );
		if ( preg_match( '/[^0-9+\-\s().]/', $phone ) ) {
			return '';
		}
		$plus   = 0 === strpos( trim( $phone ), '+' );
		$digits = preg_replace( '/\D+/', '', $phone );
		if ( $plus && 0 === strpos( $digits, '98' ) ) {
			$digits = '0' . substr( $digits, 2 );
			$plus   = false;
		}
		$length = strlen( $digits );
		if ( $length < 8 || $length > 15 ) {
			return '';
		}
		if ( ! $plus && 0 === strpos( $digits, '09' ) && 11 !== $length ) {
			return '';
		}
		return ( $plus ? '+' : '' ) . $digits;
	}

	/**
	 * Full submission pipeline shared by REST and admin-post.
	 *
	 * @param array $raw Unslashed request data.
	 * @return array { ok: bool, code: string, message: string, errors: array }
	 */
	public static function process( array $raw ) {
		// Honeypot: pretend success so bots learn nothing.
		if ( ! empty( $raw['dv_website'] ) ) {
			return self::result( true, 'sent' );
		}

		// Field errors first, so a person always learns what to fix.
		$checked = self::validate( $raw );
		if ( $checked['errors'] ) {
			return self::result( false, 'invalid', 'لطفاً موارد مشخص‌شده را اصلاح کنید.', $checked['errors'] );
		}
		$data = $checked['data'];

		$token_error = self::check_token( isset( $raw['dv_token'] ) ? (string) $raw['dv_token'] : '' );
		if ( 'too_fast' === $token_error ) {
			return self::result( false, 'too_fast', 'ارسال بیش از حد سریع بود. چند ثانیه صبر کنید و دوباره بفرستید.' );
		}
		if ( '' !== $token_error ) {
			return self::result( false, 'expired', 'اعتبار فرم تمام شده است. صفحه را تازه کنید و دوباره بفرستید.' );
		}

		if ( ! self::within_rate_limit() ) {
			return self::result( false, 'rate_limited', 'تعداد درخواست‌های ارسالی از این اتصال زیاد است. لطفاً بعداً تلاش کنید یا تماس تلفنی بگیرید.' );
		}

		$fingerprint = 'dadvar_dup_' . md5( $data['phone'] . '|' . $data['topic'] . '|' . $data['message'] );
		if ( get_transient( $fingerprint ) ) {
			return self::result( true, 'duplicate', 'این درخواست پیش‌تر ثبت شده است؛ نیازی به ارسال دوباره نیست.' );
		}

		$post_id = Dadvar_Core_Inquiries::create( $data );
		if ( is_wp_error( $post_id ) || ! $post_id ) {
			return self::result( false, 'storage', 'ثبت درخواست با خطا روبه‌رو شد. لطفاً تماس تلفنی بگیرید.' );
		}
		set_transient( $fingerprint, 1, self::DUPLICATE_SPAN );

		$mail_ok = self::notify( $post_id, $data );
		update_post_meta( $post_id, '_dadvar_mail', $mail_ok ? 'accepted' : 'failed' );

		/**
		 * Fires after a request was stored. Use for SMS or CRM integrations.
		 *
		 * @param int   $post_id Request ID.
		 * @param array $data    Clean data.
		 */
		do_action( 'dadvar_inquiry_received', $post_id, $data );

		return self::result( true, 'sent' );
	}

	/**
	 * Builds a result array.
	 *
	 * @param bool   $ok      Success.
	 * @param string $code    Machine code.
	 * @param string $message Human message.
	 * @param array  $errors  Field errors.
	 * @return array
	 */
	private static function result( $ok, $code, $message = '', $errors = array() ) {
		return array(
			'ok'      => $ok,
			'code'    => $code,
			'message' => $message,
			'errors'  => $errors,
		);
	}

	/**
	 * Fixed-window rate limit per hashed client IP. Raw IPs are never stored.
	 *
	 * @return bool True when the request is allowed.
	 */
	private static function within_rate_limit() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
		/**
		 * Filters the client identifier used for rate limiting (e.g. behind a trusted proxy).
		 *
		 * @param string $ip Remote address.
		 */
		$ip    = (string) apply_filters( 'dadvar_form_client_ip', $ip );
		$key   = 'dadvar_rl_' . substr( wp_hash( 'rl|' . $ip ), 0, 24 );
		$count = (int) get_transient( $key );
		if ( $count >= self::RATE_LIMIT ) {
			return false;
		}
		set_transient( $key, $count + 1, self::RATE_WINDOW );
		return true;
	}

	/**
	 * Sends the notification email. Returns wp_mail()'s result, which only means
	 * the message was handed to the mail system — not that it was delivered.
	 *
	 * @param int   $post_id Request ID.
	 * @param array $data    Clean data.
	 * @return bool
	 */
	private static function notify( $post_id, array $data ) {
		$to = dadvar_office( 'notify_email' );
		$to = $to ? $to : get_option( 'admin_email' );

		$lines = array(
			'یک درخواست مشاورهٔ تازه در سایت ثبت شد.',
			'',
			'نام: ' . $data['name'],
			'تلفن: ' . $data['phone'],
			'موضوع: ' . $data['topic'],
		);
		if ( $data['time'] ) {
			$lines[] = 'زمان مناسب تماس: ' . $data['time'];
		}
		if ( $data['email'] ) {
			$lines[] = 'ایمیل: ' . $data['email'];
		}
		if ( dadvar_office( 'email_include_body' ) && $data['message'] ) {
			$lines[] = '';
			$lines[] = 'شرح کوتاه:';
			$lines[] = $data['message'];
		}
		$lines[] = '';
		$lines[] = 'مشاهده در پیشخوان: ' . admin_url( 'post.php?post=' . (int) $post_id . '&action=edit' );

		$headers = array( 'Content-Type: text/plain; charset=UTF-8' );
		if ( $data['email'] ) {
			$headers[] = 'Reply-To: ' . str_replace( array( "\r", "\n" ), '', $data['name'] ) . ' <' . $data['email'] . '>';
		}

		return (bool) wp_mail( $to, 'درخواست مشاورهٔ تازه — ' . wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ), implode( "\n", $lines ), $headers );
	}

	/**
	 * REST routes. The inquiry route is public by design (anonymous visitors);
	 * protection comes from validation, signed token, honeypot and rate limit.
	 */
	public static function register_routes() {
		register_rest_route(
			self::REST_NS,
			'/inquiry',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => '__return_true',
				'callback'            => function ( WP_REST_Request $request ) {
					$raw    = $request->get_body_params();
					$result = self::process( is_array( $raw ) ? $raw : array() );
					$status = $result['ok'] ? 200 : ( 'rate_limited' === $result['code'] ? 429 : 422 );
					if ( 'storage' === $result['code'] ) {
						$status = 500;
					}
					$response = new WP_REST_Response( $result, $status );
					$response->header( 'Cache-Control', 'no-store' );
					return $response;
				},
			)
		);
		register_rest_route(
			self::REST_NS,
			'/form-token',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
				'callback'            => function () {
					$response = new WP_REST_Response( array( 'token' => self::token() ) );
					$response->header( 'Cache-Control', 'no-store' );
					return $response;
				},
			)
		);
	}

	/**
	 * No-JavaScript submission: process, then redirect back (Post/Redirect/Get).
	 */
	public static function handle_post() {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- anonymous public form; signed token checked in process().
		$raw    = wp_unslash( $_POST );
		$result = self::process( is_array( $raw ) ? $raw : array() );

		$back = wp_get_referer();
		$back = $back ? $back : home_url( '/' );
		$back = remove_query_arg( array( 'dv_state' ), $back );

		$key = wp_generate_password( 16, false );
		$old = array();
		if ( ! $result['ok'] ) {
			foreach ( array( 'dv_name', 'dv_phone', 'dv_email', 'dv_topic', 'dv_time', 'dv_message' ) as $field ) {
				$old[ $field ] = isset( $raw[ $field ] ) && is_scalar( $raw[ $field ] ) ? sanitize_textarea_field( (string) $raw[ $field ] ) : '';
			}
		}
		set_transient(
			'dadvar_state_' . $key,
			array(
				'result'  => $result['ok'] ? 'sent' : 'error',
				'general' => $result['ok'] ? '' : $result['message'],
				'errors'  => $result['errors'],
				'values'  => $old,
			),
			5 * MINUTE_IN_SECONDS
		);
		wp_safe_redirect( add_query_arg( 'dv_state', $key, $back ) . '#dadvar-form' );
		exit;
	}

	/**
	 * Reads (and deletes) the state left by a no-JS submission.
	 *
	 * @return array
	 */
	private static function read_redirect_state() {
		$empty = array(
			'result'  => '',
			'general' => '',
			'errors'  => array(),
			'values'  => array(),
		);
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only lookup of a random one-time key.
		$key = isset( $_GET['dv_state'] ) ? preg_replace( '/[^A-Za-z0-9]/', '', (string) wp_unslash( $_GET['dv_state'] ) ) : '';
		if ( '' === $key ) {
			return $empty;
		}
		$state = get_transient( 'dadvar_state_' . $key );
		delete_transient( 'dadvar_state_' . $key );
		return is_array( $state ) ? wp_parse_args( $state, $empty ) : $empty;
	}
}

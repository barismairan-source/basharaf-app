<?php
/**
 * Page layouts used by the optional sample-content importer and the template export.
 *
 * All wording is placeholder copy, marked «نمونه». No names, licence numbers,
 * statistics, testimonials or case results are invented.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Layout definitions.
 */
final class Dadvar_Core_Layouts {

	/**
	 * Home page.
	 *
	 * @param array $ctx { contact_url, about_url, services_url, articles_url, image_id }.
	 * @return array
	 */
	public static function home( array $ctx ) {
		$b = 'Dadvar_Core_Layout_Builder';
		return $b::clean(
			array(
				$b::section(
					'معرفی (بالای صفحه)',
					array(
						$b::heading( 'وکالت و مشاورهٔ حقوقی با روندی روشن و قابل‌پیگیری', 'h1', true ),
						$b::text( '<p>[متن نمونه] این‌جا در دو یا سه جمله بنویسید چه کسی هستید، در چه حوزه‌هایی و در کدام شهر فعالیت می‌کنید و مخاطب چه کمکی می‌تواند از شما بگیرد.</p>', true ),
						$b::group(
							array(
								$b::button( 'درخواست مشاوره', $ctx['contact_url'] ),
								$b::widget(
									'dadvar-call-button',
									array(
										'label'        => 'تماس تلفنی',
										'button_style' => 'light',
										'show_number'  => 'yes',
									)
								),
							),
							array(
								'title'     => 'دکمه‌های اقدام',
								'direction' => 'row',
								'align'     => 'center',
							)
						),
					),
					array( 'dark' => true )
				),
				$b::section(
					'خدمات اصلی',
					array(
						$b::heading( 'حوزه‌های تخصصی', 'h2' ),
						$b::text( '<p>[متن نمونه] یک جملهٔ کوتاه دربارهٔ تمرکز تخصصی دفتر. فهرست زیر خودکار از بخش «خدمات» پیشخوان خوانده می‌شود.</p>' ),
						$b::widget( 'dadvar-services', array( 'count' => 6 ) ),
					)
				),
				$b::section(
					'معرفی کوتاه',
					array(
						$b::group(
							array(
								$b::image( $ctx['image_id'] ),
								$b::group(
									array(
										$b::heading( 'دربارهٔ وکیل', 'h2' ),
										$b::text( '<p>[متن نمونه] معرفی کوتاه و واقعی: سابقهٔ تحصیلی و حرفه‌ای قابل‌استناد، حوزه‌های تمرکز و شیوهٔ کار. از ادعاهای اثبات‌نشده و وعدهٔ نتیجه پرهیز کنید.</p>' ),
										$b::widget( 'dadvar-lawyer', array( 'show_license' => 'yes' ) ),
										$b::button( 'بیشتر دربارهٔ وکیل', $ctx['about_url'] ),
									),
									array( 'title' => 'متن معرفی' )
								),
							),
							array(
								'title'   => 'تصویر و متن',
								'columns' => 2,
							)
						),
					),
					array( 'surface' => true )
				),
				$b::section(
					'دلایل انتخاب',
					array(
						$b::heading( 'شیوهٔ همکاری ما', 'h2' ),
						$b::group(
							array(
								self::card( 'شفافیت دربارهٔ روند و هزینه', '[نمونه] پیش از شروع، مراحل احتمالی کار و نحوهٔ محاسبهٔ حق‌الوکاله به‌روشنی گفته می‌شود.' ),
								self::card( 'تمرکز بر حوزه‌های مشخص', '[نمونه] فقط در حوزه‌هایی وکالت می‌پذیریم که در آن‌ها تجربهٔ کافی داریم.' ),
								self::card( 'اطلاع‌رسانی منظم', '[نمونه] از هر اقدام مهم در پرونده و زمان‌بندی مراحل بعدی مطلع می‌شوید.' ),
							),
							array(
								'title'   => 'دلایل',
								'columns' => 3,
							)
						),
					)
				),
				$b::section(
					'مراحل دریافت خدمات',
					array(
						$b::heading( 'مراحل دریافت مشاوره', 'h2' ),
						$b::group(
							array(
								self::card( '۱. تماس یا ثبت درخواست', 'از راه تلفن یا فرم سایت، موضوع کلی را اعلام کنید.' ),
								self::card( '۲. هماهنگی اولیه', 'برای تعیین وقت مشاوره و مدارک لازم با شما تماس می‌گیریم.' ),
								self::card( '۳. جلسهٔ مشاوره', 'موضوع بررسی و راه‌های قانونی پیش رو توضیح داده می‌شود.' ),
								self::card( '۴. تصمیم دربارهٔ ادامه', 'در صورت تمایل، شرایط وکالت و قرارداد به‌صورت مکتوب ارائه می‌شود.' ),
							),
							array(
								'title'   => 'مراحل',
								'columns' => 4,
							)
						),
					),
					array( 'surface' => true )
				),
				$b::section(
					'مقالات منتخب',
					array(
						$b::heading( 'مقالات و راهنماهای حقوقی', 'h2' ),
						$b::widget( 'dadvar-posts', array( 'count' => 3 ) ),
						$b::button( 'همهٔ مقالات', $ctx['articles_url'] ),
					)
				),
				$b::section(
					'پرسش‌های متداول',
					array(
						$b::heading( 'پرسش‌های متداول', 'h2' ),
						$b::faq(
							array(
								array( 'برای مشاورهٔ اولیه چه مدارکی همراه داشته باشم؟', '<p>[پاسخ نمونه] هر سند، قرارداد، ابلاغیه یا مکاتبه‌ای که به موضوع مربوط است. هنگام هماهنگی وقت، فهرست دقیق‌تر اعلام می‌شود.</p>' ),
								array( 'آیا مشاورهٔ اولیه هزینه دارد؟', '<p>[پاسخ نمونه — با سیاست واقعی دفتر جایگزین کنید] هزینهٔ جلسهٔ مشاوره هنگام تعیین وقت اعلام می‌شود.</p>' ),
								array( 'آیا مشاورهٔ تلفنی یا آنلاین هم ممکن است؟', '<p>[پاسخ نمونه] در برخی موضوعات بله. هنگام تماس اولیه هماهنگ می‌شود.</p>' ),
								array( 'آیا نتیجهٔ پرونده تضمین می‌شود؟', '<p>خیر. هیچ وکیلی نمی‌تواند نتیجهٔ رسیدگی قضایی را تضمین کند؛ تعهد وکیل، پیگیری دقیق و قانونی پرونده است.</p>' ),
							)
						),
					),
					array( 'surface' => true )
				),
				$b::section(
					'دعوت نهایی به اقدام',
					array(
						$b::heading( 'برای بررسی موضوع خود با دفتر در تماس باشید', 'h2', true ),
						$b::text( '<p>[متن نمونه] یک جملهٔ کوتاه دربارهٔ زمان پاسخ‌گویی و راه‌های تماس.</p>', true ),
						$b::group(
							array(
								$b::button( 'درخواست مشاوره', $ctx['contact_url'] ),
								$b::widget(
									'dadvar-call-button',
									array(
										'label'        => 'تماس تلفنی',
										'button_style' => 'light',
									)
								),
							),
							array(
								'title'     => 'دکمه‌ها',
								'direction' => 'row',
								'align'     => 'center',
							)
						),
					),
					array( 'dark' => true )
				),
			)
		);
	}

	/**
	 * A simple card (inner container with heading + text).
	 *
	 * @param string $title Title.
	 * @param string $text  Text.
	 * @return array
	 */
	private static function card( $title, $text ) {
		return Dadvar_Core_Layout_Builder::group(
			array(
				Dadvar_Core_Layout_Builder::heading( $title, 'h3' ),
				Dadvar_Core_Layout_Builder::text( '<p>' . $text . '</p>' ),
			),
			array(
				'title' => 'کارت',
				'card'  => true,
			)
		);
	}

	/**
	 * About page.
	 *
	 * @param array $ctx Context.
	 * @return array
	 */
	public static function about( array $ctx ) {
		$b = 'Dadvar_Core_Layout_Builder';
		return $b::clean(
			array(
				$b::section(
					'عنوان صفحه',
					array(
						$b::heading( 'دربارهٔ وکیل', 'h1' ),
						$b::text( '<p>[متن نمونه] یک پاراگراف معرفی کوتاه.</p>' ),
					),
					array( 'surface' => true )
				),
				$b::section(
					'معرفی',
					array(
						$b::group(
							array(
								$b::image( $ctx['image_id'] ),
								$b::group(
									array(
										$b::heading( 'مشخصات حرفه‌ای', 'h2' ),
										$b::widget( 'dadvar-lawyer', array( 'show_license' => 'yes' ) ),
										$b::heading( 'سوابق تحصیلی و حرفه‌ای', 'h2' ),
										$b::text( '<ul><li>[نمونه] مدرک تحصیلی و دانشگاه — فقط مورد واقعی</li><li>[نمونه] سال اخذ پروانه و مرجع صدور</li><li>[نمونه] عضویت‌ها یا دوره‌های تخصصی قابل‌استناد</li></ul>' ),
										$b::heading( 'رویکرد کاری', 'h2' ),
										$b::text( '<p>[متن نمونه] چگونه با موکل همکاری می‌کنید، چگونه اطلاع‌رسانی می‌کنید و چه انتظاری باید داشت.</p>' ),
									),
									array( 'title' => 'متن' )
								),
							),
							array(
								'title'   => 'تصویر و متن',
								'columns' => 2,
							)
						),
					)
				),
				$b::section(
					'دعوت به اقدام',
					array(
						$b::heading( 'درخواست مشاوره', 'h2', true ),
						$b::text( '<p>برای هماهنگی وقت مشاوره فرم را تکمیل کنید یا تماس بگیرید.</p>', true ),
						$b::button( 'درخواست مشاوره', $ctx['contact_url'] ),
					),
					array( 'dark' => true )
				),
			)
		);
	}

	/**
	 * Contact page.
	 *
	 * @param array $ctx Context.
	 * @return array
	 */
	public static function contact( array $ctx ) {
		unset( $ctx );
		$b = 'Dadvar_Core_Layout_Builder';
		return array(
			$b::section(
				'عنوان صفحه',
				array(
					$b::heading( 'تماس و درخواست مشاوره', 'h1' ),
					$b::text( '<p>برای هماهنگی وقت مشاوره، فرم زیر را تکمیل کنید یا در ساعات کاری تماس بگیرید. این فرم فقط برای تماس اولیه است؛ لطفاً جزئیات محرمانهٔ پرونده را در آن ننویسید.</p>' ),
				),
				array( 'surface' => true )
			),
			$b::section(
				'فرم و اطلاعات تماس',
				array(
					$b::group(
						array(
							$b::group(
								array(
									$b::heading( 'فرم درخواست مشاوره', 'h2' ),
									$b::widget( 'dadvar-consultation-form' ),
								),
								array( 'title' => 'فرم' )
							),
							$b::group(
								array(
									$b::heading( 'راه‌های ارتباطی', 'h2' ),
									$b::widget( 'dadvar-office-info' ),
								),
								array(
									'title' => 'اطلاعات تماس',
									'card'  => true,
								)
							),
						),
						array(
							'title'   => 'دو ستون',
							'columns' => 2,
						)
					),
				)
			),
		);
	}

	/**
	 * Service page.
	 *
	 * @param array $service { title, intro, cases[], process[], documents[], faq[][] }.
	 * @param array $ctx     Context.
	 * @return array
	 */
	public static function service( array $service, array $ctx ) {
		$b    = 'Dadvar_Core_Layout_Builder';
		$list = function ( array $items ) {
			return '<ul><li>' . implode( '</li><li>', array_map( 'esc_html', $items ) ) . '</li></ul>';
		};
		return array(
			$b::section(
				'معرفی خدمت',
				array(
					$b::heading( $service['title'], 'h1' ),
					$b::text( '<p>' . esc_html( $service['intro'] ) . '</p>' ),
					$b::button( 'درخواست مشاوره دربارهٔ این موضوع', $ctx['contact_url'] ),
				),
				array( 'surface' => true )
			),
			$b::section(
				'جزئیات خدمت',
				array(
					$b::group(
						array(
							$b::group(
								array(
									$b::heading( 'چه موضوعاتی را شامل می‌شود؟', 'h2' ),
									$b::text( $list( $service['cases'] ) ),
								),
								array(
									'title' => 'موارد کاربرد',
									'card'  => true,
								)
							),
							$b::group(
								array(
									$b::heading( 'روند همکاری', 'h2' ),
									$b::text( '<ol><li>' . implode( '</li><li>', array_map( 'esc_html', $service['process'] ) ) . '</li></ol>' ),
								),
								array(
									'title' => 'روند',
									'card'  => true,
								)
							),
							$b::group(
								array(
									$b::heading( 'اطلاعات و مدارک اولیهٔ لازم', 'h2' ),
									$b::text( $list( $service['documents'] ) ),
								),
								array(
									'title' => 'مدارک',
									'card'  => true,
								)
							),
						),
						array(
							'title'   => 'سه ستون',
							'columns' => 3,
						)
					),
					$b::text( '<p><small>اطلاعات این صفحه جنبهٔ معرفی عمومی دارد و جایگزین مشاورهٔ حقوقی متناسب با پروندهٔ شما نیست. نتیجهٔ رسیدگی قضایی قابل‌تضمین نیست.</small></p>' ),
				)
			),
			$b::section(
				'پرسش‌های رایج',
				array(
					$b::heading( 'پرسش‌های رایج', 'h2' ),
					$b::faq( $service['faq'] ),
				),
				array( 'surface' => true )
			),
			$b::section(
				'تماس',
				array(
					$b::heading( 'برای بررسی موضوع خود تماس بگیرید', 'h2', true ),
					$b::group(
						array(
							$b::button( 'درخواست مشاوره', $ctx['contact_url'] ),
							$b::widget(
								'dadvar-call-button',
								array(
									'label'        => 'تماس تلفنی',
									'button_style' => 'light',
								)
							),
						),
						array(
							'title'     => 'دکمه‌ها',
							'direction' => 'row',
							'align'     => 'center',
						)
					),
				),
				array( 'dark' => true )
			),
		);
	}

	/**
	 * Sample services (placeholder copy; replace with the office's real services).
	 *
	 * @return array
	 */
	public static function services() {
		$faq_common = array( 'آیا نتیجهٔ پرونده تضمین می‌شود؟', '<p>خیر. تعهد وکیل پیگیری دقیق و قانونی پرونده است و نتیجهٔ رسیدگی به تصمیم مرجع قضایی بستگی دارد.</p>' );
		return array(
			'family'   => array(
				'title'     => 'دعاوی خانواده',
				'excerpt'   => '[نمونه] مشاوره و وکالت در موضوعاتی مانند مهریه، نفقه، حضانت و طلاق.',
				'intro'     => '[متن نمونه] معرفی کوتاه این خدمت: چه کسانی معمولاً به آن نیاز دارند و دفتر در چه مرحله‌ای می‌تواند کمک کند.',
				'cases'     => array( 'مطالبهٔ مهریه و نفقه', 'حضانت و ملاقات فرزند', 'طلاق توافقی یا از طرف یکی از زوجین', 'تنظیم توافق‌نامه‌ها' ),
				'process'   => array( 'دریافت شرح کوتاه موضوع و تعیین وقت', 'بررسی مدارک در جلسهٔ مشاوره', 'توضیح راه‌های قانونی و برآورد مراحل', 'در صورت توافق، عقد قرارداد وکالت و پیگیری' ),
				'documents' => array( 'سند ازدواج', 'شناسنامه و کارت ملی', 'هر ابلاغیه یا رأی صادرشدهٔ قبلی' ),
				'faq'       => array(
					array( 'طلاق توافقی معمولاً چقدر زمان می‌برد؟', '<p>[پاسخ نمونه — توسط وکیل تکمیل شود] به شرایط پرونده و نوبت‌دهی مراجع بستگی دارد و در جلسهٔ مشاوره برآورد می‌شود.</p>' ),
					$faq_common,
				),
			),
			'property' => array(
				'title'     => 'املاک و قراردادها',
				'excerpt'   => '[نمونه] بررسی و تنظیم قرارداد، الزام به تنظیم سند، خلع ید و اختلافات ملکی.',
				'intro'     => '[متن نمونه] معرفی کوتاه این خدمت و این‌که بررسی قرارداد پیش از امضا چگونه از اختلاف‌های بعدی پیشگیری می‌کند.',
				'cases'     => array( 'بررسی قرارداد پیش از امضا', 'الزام به تنظیم سند رسمی', 'خلع ید و تخلیه', 'فسخ قرارداد' ),
				'process'   => array( 'دریافت شرح کوتاه و نوع قرارداد', 'بررسی اسناد و قرارداد', 'ارائهٔ نظر و راهکار', 'تنظیم اظهارنامه، دادخواست یا قرارداد در صورت نیاز' ),
				'documents' => array( 'قرارداد یا مبایعه‌نامه', 'سند مالکیت یا استعلام‌ها', 'رسیدهای پرداخت' ),
				'faq'       => array(
					array( 'آیا قبل از امضای قرارداد هم مشاوره می‌دهید؟', '<p>[پاسخ نمونه] بله؛ بررسی قرارداد پیش از امضا یکی از خدمات این بخش است.</p>' ),
					$faq_common,
				),
			),
			'criminal' => array(
				'title'     => 'امور کیفری',
				'excerpt'   => '[نمونه] مشاوره و دفاع در مراحل دادسرا و دادگاه.',
				'intro'     => '[متن نمونه] معرفی کوتاه خدمت و اهمیت مشورت حقوقی در مراحل ابتدایی رسیدگی.',
				'cases'     => array( 'تنظیم شکوائیه', 'دفاع در مرحلهٔ تحقیقات مقدماتی', 'دفاع در دادگاه', 'اعتراض به قرارها و آرا' ),
				'process'   => array( 'دریافت شرح کوتاه و تعیین وقت فوری در صورت نیاز', 'بررسی پرونده و مدارک', 'تعیین راهبرد دفاع', 'حضور در جلسات و پیگیری' ),
				'documents' => array( 'احضاریه یا ابلاغیه', 'مدارک و مستندات مرتبط', 'کارت ملی' ),
				'faq'       => array(
					array( 'در چه مرحله‌ای باید وکیل بگیرم؟', '<p>[پاسخ نمونه] هرچه زودتر؛ بهتر است پیش از اظهارات رسمی با وکیل مشورت کنید.</p>' ),
					$faq_common,
				),
			),
			'claims'   => array(
				'title'     => 'چک، سفته و مطالبات',
				'excerpt'   => '[نمونه] وصول چک برگشتی، مطالبهٔ وجه و اجرای اسناد.',
				'intro'     => '[متن نمونه] معرفی کوتاه روش‌های قانونی پیگیری مطالبات و انتخاب مسیر مناسب.',
				'cases'     => array( 'وصول چک برگشتی', 'مطالبهٔ وجه سفته', 'اجرای اسناد رسمی', 'توقیف اموال' ),
				'process'   => array( 'دریافت شرح کوتاه و نوع سند', 'بررسی سند و گواهی‌ها', 'انتخاب مسیر قانونی مناسب', 'پیگیری تا مرحلهٔ اجرا' ),
				'documents' => array( 'اصل چک یا سفته', 'گواهی عدم پرداخت (در صورت وجود)', 'هر مکاتبه با بدهکار' ),
				'faq'       => array(
					array( 'برای چک برگشتی از کجا شروع کنم؟', '<p>[پاسخ نمونه] ابتدا مدارک را در جلسهٔ مشاوره بررسی می‌کنیم تا مسیر مناسب انتخاب شود.</p>' ),
					$faq_common,
				),
			),
		);
	}

	/**
	 * Sample articles (generic, clearly marked; must be reviewed by the lawyer before launch).
	 *
	 * @return array
	 */
	public static function articles() {
		$note = '<!-- wp:paragraph {"className":"dv-sample-note"} --><p class="dv-sample-note"><strong>متن نمونه:</strong> پیش از انتشار عمومی، این مطلب باید توسط وکیل بازنویسی و تأیید شود. محتوای این صفحه جنبهٔ آموزشی عمومی دارد و مشاورهٔ حقوقی نیست.</p><!-- /wp:paragraph -->';
		$p    = function ( $text ) {
			return '<!-- wp:paragraph --><p>' . $text . '</p><!-- /wp:paragraph -->';
		};
		$h    = function ( $text ) {
			return '<!-- wp:heading --><h2 class="wp-block-heading">' . $text . '</h2><!-- /wp:heading -->';
		};
		return array(
			'checklist' => array(
				'title'    => 'پیش از جلسهٔ مشاورهٔ حقوقی چه چیزهایی را آماده کنیم؟',
				'category' => 'راهنمای مراجعه',
				'excerpt'  => 'فهرستی ساده برای این‌که از جلسهٔ مشاوره بیشترین استفاده را ببرید.',
				'content'  => $note . $p( 'جلسهٔ مشاوره زمانی مفیدتر است که اطلاعات و مدارک مرتبط از قبل آماده باشد.' ) . $h( 'خلاصهٔ زمانی رویدادها' ) . $p( 'رویدادهای مهم را به ترتیب تاریخ روی یک برگه بنویسید.' ) . $h( 'مدارک مرتبط' ) . $p( 'قراردادها، ابلاغیه‌ها، رسیدها و مکاتبات را مرتب همراه داشته باشید.' ) . $h( 'پرسش‌های شما' ) . $p( 'پرسش‌هایتان را از پیش بنویسید تا موردی از قلم نیفتد.' ),
			),
			'contract'  => array(
				'title'    => 'نکاتی که پیش از امضای قرارداد باید بررسی شود',
				'category' => 'قراردادها',
				'excerpt'  => 'چند نکتهٔ عمومی برای خواندن دقیق‌تر قراردادها.',
				'content'  => $note . $p( 'بسیاری از اختلاف‌ها از بندهایی شروع می‌شود که هنگام امضا با دقت خوانده نشده‌اند.' ) . $h( 'طرفین و موضوع قرارداد' ) . $p( 'مشخصات کامل طرفین و موضوع قرارداد باید بدون ابهام نوشته شود.' ) . $h( 'تعهدات و زمان‌بندی' ) . $p( 'زمان و شیوهٔ انجام هر تعهد را دقیق مشخص کنید.' ) . $h( 'شرایط فسخ' ) . $p( 'شرایط و آثار فسخ را پیش از امضا بررسی کنید.' ),
			),
			'choose'    => array(
				'title'    => 'چگونه وکیل مناسب موضوع خود را انتخاب کنیم؟',
				'category' => 'راهنمای مراجعه',
				'excerpt'  => 'معیارهای عمومی برای انتخاب آگاهانه.',
				'content'  => $note . $p( 'انتخاب وکیل تصمیم مهمی است و بهتر است بر پایهٔ اطلاعات قابل‌بررسی انجام شود.' ) . $h( 'استعلام پروانه' ) . $p( 'اعتبار پروانهٔ وکالت را از مرجع صادرکننده استعلام کنید.' ) . $h( 'شفافیت قرارداد' ) . $p( 'حق‌الوکاله و حدود اختیارات را مکتوب و روشن کنید.' ),
			),
		);
	}
}

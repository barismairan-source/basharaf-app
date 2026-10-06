<?php
/**
 * Reusable output components. Used by Elementor widgets, shortcodes and the theme,
 * so each piece of markup exists exactly once.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Markup components.
 */
final class Dadvar_Core_Components {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register' ) );
	}

	/**
	 * Registers the shared stylesheet and shortcodes.
	 */
	public static function register() {
		wp_register_style( 'dadvar-components', DADVAR_CORE_URL . 'assets/css/components.css', array(), DADVAR_CORE_VERSION );

		add_shortcode( 'dadvar_office', array( __CLASS__, 'shortcode_field' ) );
		add_shortcode( 'dadvar_office_info', array( __CLASS__, 'shortcode_office_info' ) );
		add_shortcode( 'dadvar_call_button', array( __CLASS__, 'shortcode_call_button' ) );
		add_shortcode( 'dadvar_services', array( __CLASS__, 'shortcode_services' ) );
		add_shortcode( 'dadvar_posts', array( __CLASS__, 'shortcode_posts' ) );
		add_shortcode( 'dadvar_lawyer', array( __CLASS__, 'shortcode_lawyer' ) );
	}

	/**
	 * Small inline SVG icons (no icon font download).
	 *
	 * @param string $name Icon name.
	 * @return string
	 */
	public static function icon( $name ) {
		$paths = array(
			'phone'  => '<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/>',
			'mobile' => '<path d="M16 1H8a3 3 0 0 0-3 3v16a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3zm-4 21a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5-4H7V4h10z"/>',
			'email'  => '<path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/>',
			'pin'    => '<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>',
			'clock'  => '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>',
			'route'  => '<path d="M21.7 11.3 12.7 2.3a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l9 9a1 1 0 0 0 1.4 0l9-9a1 1 0 0 0 0-1.4zM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5z"/>',
		);
		if ( ! isset( $paths[ $name ] ) ) {
			return '';
		}
		return '<svg class="dv-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="currentColor">' . $paths[ $name ] . '</svg>';
	}

	/**
	 * Phone markup: Persian digits for display, ASCII digits in the link.
	 *
	 * @param string $phone Phone.
	 * @return string
	 */
	public static function phone_link( $phone ) {
		$href = dadvar_tel_href( $phone );
		if ( '' === $href ) {
			return esc_html( $phone );
		}
		return '<a href="' . esc_url( $href, array( 'tel' ) ) . '"><bdi dir="ltr">' . esc_html( dadvar_fa_digits( dadvar_latin_digits( $phone ) ) ) . '</bdi></a>';
	}

	/**
	 * Office contact list.
	 *
	 * @param array $args { fields: string[], show_social: bool, layout: list|inline }.
	 * @return string
	 */
	public static function office_info( $args = array() ) {
		$args = wp_parse_args(
			$args,
			array(
				'fields'      => array( 'phone', 'mobile', 'email', 'address', 'hours', 'map' ),
				'show_social' => true,
				'layout'      => 'list',
			)
		);
		wp_enqueue_style( 'dadvar-components' );

		$items = array();
		foreach ( (array) $args['fields'] as $field ) {
			switch ( $field ) {
				case 'phone':
				case 'mobile':
					$value = dadvar_office( $field );
					if ( $value ) {
						$items[] = array( $field, 'phone' === $field ? 'تلفن' : 'همراه', self::phone_link( $value ) );
					}
					break;
				case 'email':
					$value = dadvar_office( 'email' );
					if ( $value ) {
						$items[] = array( 'email', 'ایمیل', '<a href="' . esc_url( 'mailto:' . antispambot( $value ) ) . '"><bdi dir="ltr">' . esc_html( antispambot( $value ) ) . '</bdi></a>' );
					}
					break;
				case 'address':
					$value = dadvar_office( 'address' );
					if ( $value ) {
						$items[] = array( 'pin', 'نشانی', '<address>' . nl2br( esc_html( dadvar_fa_digits( $value ) ) ) . '</address>' );
					}
					break;
				case 'hours':
					$value = dadvar_office( 'hours' );
					if ( $value ) {
						$items[] = array( 'clock', 'ساعات کاری', nl2br( esc_html( dadvar_fa_digits( $value ) ) ) );
					}
					break;
				case 'map':
					$value = dadvar_office( 'map_url' );
					if ( $value ) {
						$items[] = array( 'route', 'مسیریابی', '<a href="' . esc_url( $value ) . '" target="_blank" rel="noopener">مسیریابی تا دفتر<span class="screen-reader-text"> (در پنجرهٔ تازه)</span></a>' );
					}
					break;
			}
		}

		$html = '';
		if ( $items ) {
			$html .= '<ul class="dv-office dv-office--' . esc_attr( 'inline' === $args['layout'] ? 'inline' : 'list' ) . '">';
			foreach ( $items as $item ) {
				$html .= '<li class="dv-office__item">' . self::icon( $item[0] ) . '<span class="dv-office__body"><span class="dv-office__label">' . esc_html( $item[1] ) . '</span> <span class="dv-office__value">' . $item[2] . '</span></span></li>';
			}
			$html .= '</ul>';
		}
		if ( $args['show_social'] ) {
			$html .= self::social_links();
		}
		return $html;
	}

	/**
	 * Social links as a text list (no third-party icon font).
	 *
	 * @return string
	 */
	public static function social_links() {
		$links = dadvar_social_links();
		if ( ! $links ) {
			return '';
		}
		wp_enqueue_style( 'dadvar-components' );
		$html = '<ul class="dv-social" aria-label="شبکه‌های اجتماعی">';
		foreach ( $links as $key => $link ) {
			$html .= '<li><a class="dv-social__link dv-social__link--' . esc_attr( $key ) . '" href="' . esc_url( $link['url'] ) . '" rel="noopener me" target="_blank">' . esc_html( $link['label'] ) . '<span class="screen-reader-text"> (در پنجرهٔ تازه)</span></a></li>';
		}
		return $html . '</ul>';
	}

	/**
	 * Call button using the office phone (single source).
	 *
	 * @param array $args { label, source: phone|mobile, style: solid|outline, show_number }.
	 * @return string Empty when no number is configured.
	 */
	public static function call_button( $args = array() ) {
		$args  = wp_parse_args(
			$args,
			array(
				'label'       => 'تماس با دفتر',
				'source'      => 'phone',
				'style'       => 'solid',
				'show_number' => true,
			)
		);
		$phone = dadvar_office( 'mobile' === $args['source'] ? 'mobile' : 'phone' );
		if ( ! $phone ) {
			$phone = dadvar_office( 'mobile' === $args['source'] ? 'phone' : 'mobile' );
		}
		$href = dadvar_tel_href( $phone );
		if ( '' === $href ) {
			return current_user_can( 'manage_options' ) ? '<p class="dv-admin-hint">شمارهٔ تماس در «دفتر وکالت ← اطلاعات دفتر» وارد نشده است.</p>' : '';
		}
		wp_enqueue_style( 'dadvar-components' );
		$number = $args['show_number'] ? ' <bdi dir="ltr" class="dv-call__number">' . esc_html( dadvar_fa_digits( dadvar_latin_digits( $phone ) ) ) . '</bdi>' : '';
		return '<a class="dv-button dv-button--' . esc_attr( in_array( $args['style'], array( 'outline', 'light' ), true ) ? $args['style'] : 'solid' ) . ' dv-call" href="' . esc_url( $href, array( 'tel' ) ) . '">' . self::icon( 'phone' ) . '<span>' . esc_html( $args['label'] ) . $number . '</span></a>';
	}

	/**
	 * Services grid.
	 *
	 * @param array $args { count, show_excerpt, link_label, heading_tag }.
	 * @return string
	 */
	public static function services( $args = array() ) {
		$args     = wp_parse_args(
			$args,
			array(
				'count'        => 6,
				'show_excerpt' => true,
				'link_label'   => 'جزئیات این خدمت',
				'heading_tag'  => 'h3',
			)
		);
		$services = Dadvar_Core_Post_Types::services( max( 1, (int) $args['count'] ) );
		if ( ! $services ) {
			return current_user_can( 'edit_posts' ) ? '<p class="dv-admin-hint">هنوز خدمتی منتشر نشده است (پیشخوان ← خدمات).</p>' : '';
		}
		wp_enqueue_style( 'dadvar-components' );
		$tag  = in_array( $args['heading_tag'], array( 'h2', 'h3', 'h4' ), true ) ? $args['heading_tag'] : 'h3';
		$html = '<ul class="dv-cards" role="list">';
		foreach ( $services as $service ) {
			$html .= '<li class="dv-card">';
			$html .= '<' . $tag . ' class="dv-card__title"><a class="dv-card__link" href="' . esc_url( get_permalink( $service ) ) . '">' . esc_html( get_the_title( $service ) ) . '</a></' . $tag . '>';
			if ( $args['show_excerpt'] && has_excerpt( $service ) ) {
				$html .= '<p class="dv-card__text">' . esc_html( get_the_excerpt( $service ) ) . '</p>';
			}
			if ( $args['link_label'] ) {
				$html .= '<span class="dv-card__more" aria-hidden="true">' . esc_html( $args['link_label'] ) . '</span>';
			}
			$html .= '</li>';
		}
		return $html . '</ul>';
	}

	/**
	 * Recent or featured articles.
	 *
	 * @param array $args { count, category (term id), show_date, show_excerpt, heading_tag }.
	 * @return string
	 */
	public static function posts( $args = array() ) {
		$args  = wp_parse_args(
			$args,
			array(
				'count'        => 3,
				'category'     => 0,
				'show_date'    => true,
				'show_excerpt' => true,
				'heading_tag'  => 'h3',
			)
		);
		$query = array(
			'post_type'           => 'post',
			'post_status'         => 'publish',
			'posts_per_page'      => max( 1, min( 12, (int) $args['count'] ) ),
			'ignore_sticky_posts' => false,
			'no_found_rows'       => true,
		);
		if ( (int) $args['category'] ) {
			$query['cat'] = (int) $args['category'];
		}
		$posts = get_posts( $query );
		if ( ! $posts ) {
			return current_user_can( 'edit_posts' ) ? '<p class="dv-admin-hint">هنوز مقاله‌ای منتشر نشده است.</p>' : '';
		}
		wp_enqueue_style( 'dadvar-components' );
		$tag  = in_array( $args['heading_tag'], array( 'h2', 'h3', 'h4' ), true ) ? $args['heading_tag'] : 'h3';
		$html = '<ul class="dv-cards dv-cards--posts" role="list">';
		foreach ( $posts as $post ) {
			$html .= '<li class="dv-card">';
			if ( has_post_thumbnail( $post ) ) {
				$html .= '<div class="dv-card__media">' . get_the_post_thumbnail(
					$post,
					'medium_large',
					array(
						'loading' => 'lazy',
						'sizes'   => '(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw',
						'alt'     => '',
					)
				) . '</div>';
			}
			$html .= '<' . $tag . ' class="dv-card__title"><a class="dv-card__link" href="' . esc_url( get_permalink( $post ) ) . '">' . esc_html( get_the_title( $post ) ) . '</a></' . $tag . '>';
			if ( $args['show_date'] ) {
				$html .= '<p class="dv-card__meta"><time datetime="' . esc_attr( get_post_time( 'c', true, $post ) ) . '">' . esc_html( dadvar_jalali_date( get_post_time( 'U', true, $post ) ) ) . '</time></p>';
			}
			if ( $args['show_excerpt'] ) {
				$html .= '<p class="dv-card__text">' . esc_html( wp_trim_words( get_the_excerpt( $post ), 28, '…' ) ) . '</p>';
			}
			$html .= '</li>';
		}
		return $html . '</ul>';
	}

	/**
	 * Lawyer credentials from settings. Shows only filled, real fields.
	 *
	 * @param array $args { show_license: bool }.
	 * @return string
	 */
	public static function lawyer( $args = array() ) {
		$args = wp_parse_args( $args, array( 'show_license' => true ) );
		$name = dadvar_office( 'lawyer_name' );
		if ( ! $name ) {
			return current_user_can( 'manage_options' ) ? '<p class="dv-admin-hint">نام وکیل در «دفتر وکالت ← اطلاعات دفتر» وارد نشده است.</p>' : '';
		}
		wp_enqueue_style( 'dadvar-components' );
		$rows = array();
		if ( dadvar_office( 'professional_title' ) ) {
			$rows[] = array( 'عنوان', dadvar_office( 'professional_title' ) );
		}
		if ( $args['show_license'] && dadvar_office( 'license_number' ) ) {
			$rows[] = array( 'شمارهٔ پروانه', dadvar_fa_digits( dadvar_office( 'license_number' ) ) );
		}
		if ( dadvar_office( 'bar_association' ) ) {
			$rows[] = array( 'مرجع صدور پروانه', dadvar_office( 'bar_association' ) );
		}
		if ( dadvar_office( 'service_area' ) ) {
			$rows[] = array( 'حوزهٔ فعالیت', dadvar_office( 'service_area' ) );
		}
		$html = '<div class="dv-lawyer"><p class="dv-lawyer__name">' . esc_html( $name ) . '</p>';
		if ( $rows ) {
			$html .= '<dl class="dv-lawyer__facts">';
			foreach ( $rows as $row ) {
				$html .= '<div><dt>' . esc_html( $row[0] ) . '</dt><dd>' . esc_html( $row[1] ) . '</dd></div>';
			}
			$html .= '</dl>';
		}
		return $html . '</div>';
	}

	/**
	 * [dadvar_office field="phone"] — prints one field as text.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function shortcode_field( $atts ) {
		$atts  = shortcode_atts( array( 'field' => 'phone' ), $atts, 'dadvar_office' );
		$field = sanitize_key( $atts['field'] );
		if ( ! array_key_exists( $field, Dadvar_Core_Settings::defaults() ) || in_array( $field, array( 'notify_email', 'email_include_body', 'retention_days' ), true ) ) {
			return '';
		}
		$value = (string) dadvar_office( $field );
		if ( in_array( $field, array( 'phone', 'mobile' ), true ) ) {
			return self::phone_link( $value );
		}
		return esc_html( dadvar_fa_digits( $value ) );
	}

	/**
	 * Shortcode wrapper.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function shortcode_office_info( $atts ) {
		$atts = shortcode_atts(
			array(
				'fields' => 'phone,mobile,email,address,hours,map',
				'social' => 'yes',
			),
			$atts,
			'dadvar_office_info'
		);
		return self::office_info(
			array(
				'fields'      => array_map( 'sanitize_key', explode( ',', $atts['fields'] ) ),
				'show_social' => 'yes' === $atts['social'],
			)
		);
	}

	/**
	 * Shortcode wrapper.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function shortcode_call_button( $atts ) {
		$atts = shortcode_atts(
			array(
				'label'  => 'تماس با دفتر',
				'source' => 'phone',
				'style'  => 'solid',
			),
			$atts,
			'dadvar_call_button'
		);
		return self::call_button( $atts );
	}

	/**
	 * Shortcode wrapper.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function shortcode_services( $atts ) {
		$atts = shortcode_atts( array( 'count' => 6 ), $atts, 'dadvar_services' );
		return self::services( array( 'count' => (int) $atts['count'] ) );
	}

	/**
	 * Shortcode wrapper.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function shortcode_posts( $atts ) {
		$atts = shortcode_atts(
			array(
				'count'    => 3,
				'category' => 0,
			),
			$atts,
			'dadvar_posts'
		);
		return self::posts(
			array(
				'count'    => (int) $atts['count'],
				'category' => (int) $atts['category'],
			)
		);
	}

	/**
	 * Shortcode wrapper.
	 *
	 * @return string
	 */
	public static function shortcode_lawyer() {
		return self::lawyer();
	}
}

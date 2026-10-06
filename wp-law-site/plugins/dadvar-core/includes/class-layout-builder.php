<?php
/**
 * Builds Elementor element trees (containers + core widgets) and a plain-HTML fallback.
 *
 * Only standard, documented element types are produced: `container` and the core
 * widgets heading, text-editor, button, image and nested-accordion, plus this
 * plugin's own widgets. Global colors/typography are referenced through
 * `__globals__`, so the Elementor kit stays the single source of design tokens.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

/**
 * Element tree helpers.
 */
final class Dadvar_Core_Layout_Builder {

	/**
	 * Unique 7-char element id (same shape Elementor uses).
	 *
	 * @return string
	 */
	public static function id() {
		return substr( md5( wp_generate_uuid4() ), 0, 7 );
	}

	/**
	 * Padding/margin dimension value.
	 *
	 * @param int $block  Top/bottom px.
	 * @param int $inline Left/right px.
	 * @return array
	 */
	public static function box( $block, $inline = 16 ) {
		return array(
			'unit'     => 'px',
			'top'      => (string) $block,
			'right'    => (string) $inline,
			'bottom'   => (string) $block,
			'left'     => (string) $inline,
			'isLinked' => false,
		);
	}

	/**
	 * Top-level page section (boxed flex column).
	 *
	 * @param string $title    Navigator title.
	 * @param array  $children Child elements.
	 * @param array  $args     { surface: bool, tag: string, dark: bool }.
	 * @return array
	 */
	public static function section( $title, array $children, array $args = array() ) {
		$settings = array(
			'_title'         => $title,
			'content_width'  => 'boxed',
			'flex_direction' => 'column',
			'flex_gap'       => array(
				'unit'     => 'px',
				'size'     => 20,
				'column'   => '20',
				'row'      => '20',
				'isLinked' => true,
			),
			'padding'        => self::box( 72 ),
			'padding_mobile' => self::box( 48 ),
			'html_tag'       => isset( $args['tag'] ) ? $args['tag'] : 'section',
		);
		if ( ! empty( $args['surface'] ) || ! empty( $args['dark'] ) ) {
			$settings['background_background'] = 'classic';
			$settings['__globals__']           = array(
				'background_color' => ! empty( $args['dark'] ) ? 'globals/colors?id=primary' : 'globals/colors?id=dvsurface',
			);
		}
		return array(
			'id'       => self::id(),
			'elType'   => 'container',
			'isInner'  => false,
			'settings' => $settings,
			'elements' => $children,
		);
	}

	/**
	 * Inner layout container.
	 *
	 * @param array $children Child elements.
	 * @param array $args     { columns: int (grid), direction: row|column, title, card: bool }.
	 * @return array
	 */
	public static function group( array $children, array $args = array() ) {
		$settings = array(
			'_title'        => isset( $args['title'] ) ? $args['title'] : 'گروه',
			'content_width' => 'full',
		);
		if ( ! empty( $args['columns'] ) ) {
			$columns                              = (int) $args['columns'];
			$settings['container_type']           = 'grid';
			$settings['grid_columns_grid']        = array(
				'unit' => 'fr',
				'size' => $columns,
			);
			$settings['grid_columns_grid_tablet'] = array(
				'unit' => 'fr',
				'size' => min( 2, $columns ),
			);
			$settings['grid_columns_grid_mobile'] = array(
				'unit' => 'fr',
				'size' => 1,
			);
			$settings['grid_gaps']                = array(
				'unit'     => 'px',
				'column'   => '24',
				'row'      => '24',
				'isLinked' => true,
			);
		} else {
			$settings['flex_direction']        = isset( $args['direction'] ) ? $args['direction'] : 'column';
			$settings['flex_direction_mobile'] = 'column';
			$settings['flex_wrap']             = 'wrap';
			$settings['flex_gap']              = array(
				'unit'     => 'px',
				'size'     => 16,
				'column'   => '16',
				'row'      => '16',
				'isLinked' => true,
			);
			if ( isset( $args['align'] ) ) {
				$settings['flex_align_items'] = $args['align'];
			}
		}
		if ( ! empty( $args['card'] ) ) {
			$settings['padding']               = self::box( 24, 24 );
			$settings['border_border']         = 'solid';
			$settings['border_width']          = array(
				'unit'     => 'px',
				'top'      => '1',
				'right'    => '1',
				'bottom'   => '1',
				'left'     => '1',
				'isLinked' => true,
			);
			$settings['border_radius']         = array(
				'unit'     => 'px',
				'top'      => '10',
				'right'    => '10',
				'bottom'   => '10',
				'left'     => '10',
				'isLinked' => true,
			);
			$settings['background_background'] = 'classic';
			$settings['background_color']      = '#FFFFFF';
			$settings['__globals__']           = array( 'border_color' => 'globals/colors?id=dvborder' );
		}
		return array(
			'id'       => self::id(),
			'elType'   => 'container',
			'isInner'  => true,
			'settings' => $settings,
			'elements' => $children,
		);
	}

	/**
	 * Widget element.
	 *
	 * @param string $type     Widget type.
	 * @param array  $settings Settings.
	 * @return array
	 */
	public static function widget( $type, array $settings = array() ) {
		return array(
			'id'         => self::id(),
			'elType'     => 'widget',
			'widgetType' => $type,
			'settings'   => $settings,
			'elements'   => array(),
		);
	}

	/**
	 * Heading widget.
	 *
	 * @param string $text  Text.
	 * @param string $tag   h1-h4.
	 * @param bool   $light White text (on dark sections).
	 * @return array
	 */
	public static function heading( $text, $tag = 'h2', $light = false ) {
		$settings = array(
			'title'       => $text,
			'header_size' => $tag,
		);
		if ( $light ) {
			$settings['title_color'] = '#FFFFFF';
		}
		return self::widget( 'heading', $settings );
	}

	/**
	 * Text editor widget.
	 *
	 * @param string $html  Allowed HTML.
	 * @param bool   $light White text.
	 * @return array
	 */
	public static function text( $html, $light = false ) {
		$settings = array( 'editor' => $html );
		if ( $light ) {
			$settings['text_color'] = '#FFFFFF';
		}
		return self::widget( 'text-editor', $settings );
	}

	/**
	 * Button widget (accent background from global color).
	 *
	 * @param string $text Label.
	 * @param string $url  URL.
	 * @return array
	 */
	public static function button( $text, $url ) {
		return self::widget(
			'button',
			array(
				'text'        => $text,
				'link'        => array(
					'url'         => $url,
					'is_external' => '',
					'nofollow'    => '',
				),
				'size'        => 'md',
				'__globals__' => array( 'background_color' => 'globals/colors?id=accent' ),
			)
		);
	}

	/**
	 * Image widget.
	 *
	 * @param int $attachment_id Media ID.
	 * @return array|null
	 */
	public static function image( $attachment_id ) {
		if ( ! $attachment_id ) {
			return null;
		}
		return self::widget(
			'image',
			array(
				'image'      => array(
					'id'  => (int) $attachment_id,
					'url' => (string) wp_get_attachment_image_url( $attachment_id, 'full' ),
				),
				'image_size' => 'large',
			)
		);
	}

	/**
	 * Nested accordion with one text widget per item.
	 *
	 * @param array $items List of [ question, answer-html ].
	 * @return array
	 */
	public static function faq( array $items ) {
		$repeater = array();
		$children = array();
		foreach ( $items as $index => $item ) {
			$repeater[] = array(
				'item_title' => $item[0],
				'_id'        => self::id(),
			);
			$children[] = array(
				'id'       => self::id(),
				'elType'   => 'container',
				'isInner'  => true,
				'settings' => array(
					'_title'        => 'item #' . ( $index + 1 ),
					'content_width' => 'full',
				),
				'elements' => array( self::text( $item[1] ) ),
			);
		}
		return array(
			'id'         => self::id(),
			'elType'     => 'widget',
			'widgetType' => 'nested-accordion',
			'settings'   => array(
				'items'              => $repeater,
				'default_state'      => 'all_collapsed',
				'max_items_expended' => 'multiple',
				'title_tag'          => 'h3',
			),
			'elements'   => $children,
		);
	}

	/**
	 * Removes null children (e.g. an image when no media exists).
	 *
	 * @param array $elements Elements.
	 * @return array
	 */
	public static function clean( array $elements ) {
		$out = array();
		foreach ( $elements as $element ) {
			if ( null === $element ) {
				continue;
			}
			if ( ! empty( $element['elements'] ) ) {
				$element['elements'] = self::clean( $element['elements'] );
			}
			$out[] = $element;
		}
		return $out;
	}

	/**
	 * Plain HTML version of a tree, used as post_content when Elementor is not
	 * active (and as a readable fallback if Elementor is deactivated later).
	 *
	 * @param array $elements Elements.
	 * @return string
	 */
	public static function to_html( array $elements ) {
		$html = '';
		foreach ( $elements as $element ) {
			if ( 'container' === $element['elType'] ) {
				$s     = $element['settings'];
				$inner = self::to_html( $element['elements'] );
				if ( $element['isInner'] ) {
					$class = 'dv-group';
					if ( ! empty( $s['grid_columns_grid']['size'] ) ) {
						$class .= ' dv-grid dv-grid--' . (int) $s['grid_columns_grid']['size'];
					} elseif ( isset( $s['flex_direction'] ) && 'row' === $s['flex_direction'] ) {
						$class .= ' dv-row';
					}
					if ( ! empty( $s['border_border'] ) ) {
						$class .= ' dv-box';
					}
					$html .= '<div class="' . esc_attr( $class ) . '">' . $inner . '</div>';
				} else {
					$bg    = isset( $s['__globals__']['background_color'] ) ? $s['__globals__']['background_color'] : '';
					$class = 'dv-section' . ( false !== strpos( $bg, 'primary' ) ? ' dv-section--dark' : ( $bg ? ' dv-section--surface' : '' ) );
					$html .= '<section class="' . esc_attr( $class ) . '"><div class="dv-section__inner">' . $inner . '</div></section>';
				}
				continue;
			}
			$s = (array) $element['settings'];
			switch ( $element['widgetType'] ) {
				case 'heading':
					$tag   = in_array( $s['header_size'], array( 'h1', 'h2', 'h3', 'h4' ), true ) ? $s['header_size'] : 'h2';
					$html .= '<' . $tag . '>' . esc_html( $s['title'] ) . '</' . $tag . '>';
					break;
				case 'text-editor':
					$html .= wp_kses_post( $s['editor'] );
					break;
				case 'button':
					$html .= '<p><a class="dv-button dv-button--solid" href="' . esc_url( $s['link']['url'] ) . '">' . esc_html( $s['text'] ) . '</a></p>';
					break;
				case 'image':
					$html .= wp_get_attachment_image( (int) $s['image']['id'], 'large', false, array( 'loading' => 'lazy' ) );
					break;
				case 'nested-accordion':
					foreach ( $s['items'] as $i => $item ) {
						$answer = isset( $element['elements'][ $i ] ) ? self::to_html( $element['elements'][ $i ]['elements'] ) : '';
						$html  .= '<details><summary>' . esc_html( $item['item_title'] ) . '</summary>' . $answer . '</details>';
					}
					break;
				case 'dadvar-services':
					$html .= '[dadvar_services]';
					break;
				case 'dadvar-posts':
					$html .= '[dadvar_posts count="3"]';
					break;
				case 'dadvar-office-info':
					$html .= '[dadvar_office_info]';
					break;
				case 'dadvar-call-button':
					$html .= '<p>[dadvar_call_button label="' . esc_attr( isset( $s['label'] ) ? $s['label'] : 'تماس با دفتر' ) . '" style="' . esc_attr( isset( $s['button_style'] ) ? $s['button_style'] : 'solid' ) . '"]</p>';
					break;
				case 'dadvar-consultation-form':
					$html .= '[dadvar_consultation_form]';
					break;
				case 'dadvar-lawyer':
					$html .= '[dadvar_lawyer]';
					break;
			}
		}
		return $html;
	}
}

<?php
/**
 * Shared base for Dadvar Elementor widgets.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Elementor\Widget_Base;

/**
 * Common settings: category, assets, a text-color + typography style section.
 */
abstract class Dadvar_Widget_Base extends Widget_Base {

	/**
	 * Panel category.
	 *
	 * @return string[]
	 */
	public function get_categories() {
		return array( 'dadvar' );
	}

	/**
	 * Styles loaded only on pages that contain the widget.
	 *
	 * @return string[]
	 */
	public function get_style_depends() {
		return array( 'dadvar-components' );
	}

	/**
	 * Lean DOM (no extra inner wrapper).
	 *
	 * @return bool
	 */
	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	/**
	 * Data comes from settings and queries; never cache the rendered output.
	 *
	 * @return bool
	 */
	protected function is_dynamic_content(): bool {
		return true;
	}

	/**
	 * Adds a «where to edit this data» notice.
	 *
	 * @param string $text Notice.
	 */
	protected function add_source_notice( $text ) {
		$this->add_control(
			'source_notice',
			array(
				'type'            => Controls_Manager::RAW_HTML,
				'raw'             => esc_html( $text ),
				'content_classes' => 'elementor-panel-alert elementor-panel-alert-info',
			)
		);
	}

	/**
	 * Standard style section: text color, link color and typography.
	 *
	 * @param string $selector Element selector inside {{WRAPPER}}.
	 */
	protected function add_text_style_section( $selector = '' ) {
		$this->start_controls_section(
			'section_text_style',
			array(
				'label' => 'متن',
				'tab'   => Controls_Manager::TAB_STYLE,
			)
		);
		$this->add_control(
			'text_color',
			array(
				'label'     => 'رنگ متن',
				'type'      => Controls_Manager::COLOR,
				'selectors' => array( '{{WRAPPER}} ' . $selector => 'color: {{VALUE}};' ),
			)
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			array(
				'name'     => 'text_typography',
				'selector' => '{{WRAPPER}} ' . $selector,
			)
		);
		$this->end_controls_section();
	}
}

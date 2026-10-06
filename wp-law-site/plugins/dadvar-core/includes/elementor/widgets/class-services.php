<?php
/**
 * Widget: services grid (reads the «خدمات» content type).
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

use Elementor\Controls_Manager;

/**
 * Services grid.
 */
class Dadvar_Widget_Services extends Dadvar_Widget_Base {

	/** @return string */
	public function get_name() {
		return 'dadvar-services';
	}

	/** @return string */
	public function get_title() {
		return 'فهرست خدمات';
	}

	/** @return string */
	public function get_icon() {
		return 'eicon-posts-grid';
	}

	/** @return string[] */
	public function get_keywords() {
		return array( 'services', 'خدمات' );
	}

	/**
	 * Controls.
	 */
	protected function register_controls() {
		$this->start_controls_section( 'section_content', array( 'label' => 'محتوا' ) );
		$this->add_source_notice( 'خدمات از «پیشخوان ← خدمات» خوانده می‌شوند. ترتیب = فیلد «ترتیب» هر خدمت. متن کارت = «چکیده».' );
		$this->add_control(
			'count',
			array(
				'label'   => 'تعداد',
				'type'    => Controls_Manager::NUMBER,
				'min'     => 1,
				'max'     => 24,
				'default' => 6,
			)
		);
		$this->add_control(
			'columns',
			array(
				'label'     => 'ستون‌ها در رایانه',
				'type'      => Controls_Manager::SELECT,
				'options'   => array(
					'2' => '۲',
					'3' => '۳',
					'4' => '۴',
				),
				'default'   => '3',
				'selectors' => array( '{{WRAPPER}} .dv-cards' => '--dv-cards-columns: {{VALUE}};' ),
			)
		);
		$this->add_control(
			'heading_tag',
			array(
				'label'   => 'سطح عنوان کارت',
				'type'    => Controls_Manager::SELECT,
				'options' => array(
					'h2' => 'H2',
					'h3' => 'H3',
					'h4' => 'H4',
				),
				'default' => 'h3',
			)
		);
		$this->add_control(
			'show_excerpt',
			array(
				'label'        => 'نمایش چکیده',
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default'      => 'yes',
			)
		);
		$this->add_control(
			'link_label',
			array(
				'label'   => 'متن پیوند کارت',
				'type'    => Controls_Manager::TEXT,
				'default' => 'جزئیات این خدمت',
			)
		);
		$this->end_controls_section();
	}

	/**
	 * Output.
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();
		// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- component escapes its output.
		echo Dadvar_Core_Components::services(
			array(
				'count'        => (int) $settings['count'],
				'show_excerpt' => 'yes' === $settings['show_excerpt'],
				'link_label'   => $settings['link_label'],
				'heading_tag'  => $settings['heading_tag'],
			)
		);
		// phpcs:enable
	}
}

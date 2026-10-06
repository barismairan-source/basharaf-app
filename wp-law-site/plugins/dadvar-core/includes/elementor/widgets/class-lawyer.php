<?php
/**
 * Widget: lawyer credentials from office settings.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

use Elementor\Controls_Manager;

/**
 * Lawyer credentials.
 */
class Dadvar_Widget_Lawyer extends Dadvar_Widget_Base {

	/** @return string */
	public function get_name() {
		return 'dadvar-lawyer';
	}

	/** @return string */
	public function get_title() {
		return 'مشخصات حرفه‌ای وکیل';
	}

	/** @return string */
	public function get_icon() {
		return 'eicon-person';
	}

	/** @return string[] */
	public function get_keywords() {
		return array( 'lawyer', 'license', 'وکیل', 'پروانه' );
	}

	/**
	 * Controls.
	 */
	protected function register_controls() {
		$this->start_controls_section( 'section_content', array( 'label' => 'محتوا' ) );
		$this->add_source_notice( 'نام، عنوان، شمارهٔ پروانه و مرجع صدور از «دفتر وکالت ← اطلاعات دفتر» خوانده می‌شود. موارد خالی نمایش داده نمی‌شوند.' );
		$this->add_control(
			'show_license',
			array(
				'label'        => 'نمایش شمارهٔ پروانه',
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default'      => 'yes',
			)
		);
		$this->end_controls_section();
		$this->add_text_style_section( '.dv-lawyer' );
	}

	/**
	 * Output.
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();
		// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- component escapes its output.
		echo Dadvar_Core_Components::lawyer( array( 'show_license' => 'yes' === $settings['show_license'] ) );
		// phpcs:enable
	}
}

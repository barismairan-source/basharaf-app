<?php
/**
 * Widget: call button using the office phone.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

use Elementor\Controls_Manager;

/**
 * Call button.
 */
class Dadvar_Widget_Call_Button extends Dadvar_Widget_Base {

	/** @return string */
	public function get_name() {
		return 'dadvar-call-button';
	}

	/** @return string */
	public function get_title() {
		return 'دکمهٔ تماس تلفنی';
	}

	/** @return string */
	public function get_icon() {
		return 'eicon-button';
	}

	/** @return string[] */
	public function get_keywords() {
		return array( 'call', 'phone', 'button', 'تماس', 'دکمه' );
	}

	/**
	 * Controls.
	 */
	protected function register_controls() {
		$this->start_controls_section( 'section_content', array( 'label' => 'محتوا' ) );
		$this->add_source_notice( 'شمارهٔ تماس از «دفتر وکالت ← اطلاعات دفتر» خوانده می‌شود.' );
		$this->add_control(
			'label',
			array(
				'label'   => 'متن دکمه',
				'type'    => Controls_Manager::TEXT,
				'default' => 'تماس با دفتر',
			)
		);
		$this->add_control(
			'source',
			array(
				'label'   => 'شماره',
				'type'    => Controls_Manager::SELECT,
				'options' => array(
					'phone'  => 'تلفن ثابت',
					'mobile' => 'تلفن همراه',
				),
				'default' => 'phone',
			)
		);
		$this->add_control(
			'button_style',
			array(
				'label'   => 'سبک',
				'type'    => Controls_Manager::SELECT,
				'options' => array(
					'solid'   => 'توپر (اقدام اصلی)',
					'outline' => 'خطی (اقدام دوم)',
					'light'   => 'خطی روشن (روی زمینهٔ تیره)',
				),
				'default' => 'solid',
			)
		);
		$this->add_control(
			'show_number',
			array(
				'label'        => 'نمایش شماره روی دکمه',
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default'      => 'yes',
			)
		);
		$this->add_responsive_control(
			'align',
			array(
				'label'     => 'جای دکمه',
				'type'      => Controls_Manager::CHOOSE,
				'options'   => array(
					'start'  => array(
						'title' => 'ابتدا',
						'icon'  => 'eicon-text-align-right',
					),
					'center' => array(
						'title' => 'وسط',
						'icon'  => 'eicon-text-align-center',
					),
					'end'    => array(
						'title' => 'انتها',
						'icon'  => 'eicon-text-align-left',
					),
				),
				'selectors' => array( '{{WRAPPER}}' => 'text-align: {{VALUE}};' ),
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
		echo Dadvar_Core_Components::call_button(
			array(
				'label'       => $settings['label'],
				'source'      => $settings['source'],
				'style'       => $settings['button_style'],
				'show_number' => 'yes' === $settings['show_number'],
			)
		);
		// phpcs:enable
	}
}

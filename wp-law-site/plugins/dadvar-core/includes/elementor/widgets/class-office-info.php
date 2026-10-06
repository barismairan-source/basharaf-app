<?php
/**
 * Widget: office contact information (reads «اطلاعات دفتر»).
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

use Elementor\Controls_Manager;

/**
 * Office contact info.
 */
class Dadvar_Widget_Office_Info extends Dadvar_Widget_Base {

	/** @return string */
	public function get_name() {
		return 'dadvar-office-info';
	}

	/** @return string */
	public function get_title() {
		return 'اطلاعات تماس دفتر';
	}

	/** @return string */
	public function get_icon() {
		return 'eicon-call-to-action';
	}

	/** @return string[] */
	public function get_keywords() {
		return array( 'contact', 'phone', 'address', 'تماس', 'نشانی' );
	}

	/**
	 * Controls.
	 */
	protected function register_controls() {
		$this->start_controls_section( 'section_content', array( 'label' => 'محتوا' ) );
		$this->add_source_notice( 'شماره، نشانی و ساعات کاری از «دفتر وکالت ← اطلاعات دفتر» خوانده می‌شود و فقط همان‌جا ویرایش می‌شود.' );
		$this->add_control(
			'fields',
			array(
				'label'    => 'موارد نمایش',
				'type'     => Controls_Manager::SELECT2,
				'multiple' => true,
				'options'  => array(
					'phone'   => 'تلفن ثابت',
					'mobile'  => 'تلفن همراه',
					'email'   => 'ایمیل',
					'address' => 'نشانی',
					'hours'   => 'ساعات کاری',
					'map'     => 'پیوند مسیریابی',
				),
				'default'  => array( 'phone', 'mobile', 'email', 'address', 'hours', 'map' ),
			)
		);
		$this->add_control(
			'layout',
			array(
				'label'   => 'چیدمان',
				'type'    => Controls_Manager::SELECT,
				'options' => array(
					'list'   => 'فهرست عمودی',
					'inline' => 'کنار هم',
				),
				'default' => 'list',
			)
		);
		$this->add_control(
			'show_social',
			array(
				'label'        => 'نمایش شبکه‌های اجتماعی',
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default'      => 'yes',
			)
		);
		$this->end_controls_section();
		$this->add_text_style_section( '.dv-office' );
	}

	/**
	 * Output.
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();
		// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- component escapes its output.
		echo Dadvar_Core_Components::office_info(
			array(
				'fields'      => (array) $settings['fields'],
				'layout'      => $settings['layout'],
				'show_social' => 'yes' === $settings['show_social'],
			)
		);
		// phpcs:enable
	}
}

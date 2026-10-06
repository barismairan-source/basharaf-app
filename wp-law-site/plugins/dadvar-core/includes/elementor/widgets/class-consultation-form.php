<?php
/**
 * Widget: consultation request form.
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

use Elementor\Controls_Manager;

/**
 * Consultation form.
 */
class Dadvar_Widget_Consultation_Form extends Dadvar_Widget_Base {

	/** @return string */
	public function get_name() {
		return 'dadvar-consultation-form';
	}

	/** @return string */
	public function get_title() {
		return 'فرم درخواست مشاوره';
	}

	/** @return string */
	public function get_icon() {
		return 'eicon-form-horizontal';
	}

	/** @return string[] */
	public function get_keywords() {
		return array( 'form', 'contact', 'فرم', 'مشاوره' );
	}

	/** @return string[] */
	public function get_style_depends() {
		return array( 'dadvar-components', 'dadvar-form' );
	}

	/** @return string[] */
	public function get_script_depends() {
		return array( 'dadvar-form' );
	}

	/**
	 * Controls.
	 */
	protected function register_controls() {
		$this->start_controls_section( 'section_content', array( 'label' => 'محتوا' ) );
		$this->add_source_notice( 'فیلدهای فرم ثابت و حداقلی‌اند (حریم خصوصی). گزینه‌های «موضوع» از فهرست خدمات منتشرشده ساخته می‌شوند. مقصد ایمیل و مدت نگهداری: «دفتر وکالت ← اطلاعات دفتر».' );
		$this->add_control(
			'submit',
			array(
				'label'   => 'متن دکمهٔ ارسال',
				'type'    => Controls_Manager::TEXT,
				'default' => 'ارسال درخواست',
			)
		);
		$this->add_control(
			'success',
			array(
				'label'   => 'پیام موفقیت',
				'type'    => Controls_Manager::TEXTAREA,
				'default' => 'درخواست شما ثبت شد. در اولین فرصت کاری برای هماهنگی تماس می‌گیریم.',
			)
		);
		$this->end_controls_section();
	}

	/**
	 * Output.
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();
		// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- form renderer escapes its output.
		echo Dadvar_Core_Form::render(
			array(
				'submit'  => $settings['submit'],
				'success' => $settings['success'],
				'id'      => 'dadvar-form',
			)
		);
		// phpcs:enable
	}
}

<?php
/**
 * Widget: latest or featured articles (Elementor Free has no posts widget).
 *
 * @package Dadvar_Core
 */

defined( 'ABSPATH' ) || exit;

use Elementor\Controls_Manager;

/**
 * Articles grid.
 */
class Dadvar_Widget_Posts extends Dadvar_Widget_Base {

	/** @return string */
	public function get_name() {
		return 'dadvar-posts';
	}

	/** @return string */
	public function get_title() {
		return 'مقالات منتخب';
	}

	/** @return string */
	public function get_icon() {
		return 'eicon-post-list';
	}

	/** @return string[] */
	public function get_keywords() {
		return array( 'posts', 'blog', 'articles', 'مقاله' );
	}

	/**
	 * Controls.
	 */
	protected function register_controls() {
		$categories = array( '0' => 'همهٔ دسته‌ها' );
		foreach ( get_categories( array( 'hide_empty' => false ) ) as $term ) {
			$categories[ (string) $term->term_id ] = $term->name;
		}

		$this->start_controls_section( 'section_content', array( 'label' => 'محتوا' ) );
		$this->add_source_notice( 'جدیدترین نوشته‌ها نمایش داده می‌شوند؛ نوشته‌های «سنجاق‌شده» (Sticky) جلوتر قرار می‌گیرند.' );
		$this->add_control(
			'count',
			array(
				'label'   => 'تعداد',
				'type'    => Controls_Manager::NUMBER,
				'min'     => 1,
				'max'     => 12,
				'default' => 3,
			)
		);
		$this->add_control(
			'category',
			array(
				'label'   => 'دسته',
				'type'    => Controls_Manager::SELECT,
				'options' => $categories,
				'default' => '0',
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
			'show_date',
			array(
				'label'        => 'نمایش تاریخ',
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default'      => 'yes',
			)
		);
		$this->add_control(
			'show_excerpt',
			array(
				'label'        => 'نمایش خلاصه',
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default'      => 'yes',
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
		echo Dadvar_Core_Components::posts(
			array(
				'count'        => (int) $settings['count'],
				'category'     => (int) $settings['category'],
				'show_date'    => 'yes' === $settings['show_date'],
				'show_excerpt' => 'yes' === $settings['show_excerpt'],
				'heading_tag'  => $settings['heading_tag'],
			)
		);
		// phpcs:enable
	}
}

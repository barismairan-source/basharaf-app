<?php
/**
 * Template helpers.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

/**
 * Office setting from the companion plugin (empty when the plugin is inactive).
 *
 * @param string $key Field key.
 * @return string
 */
function dadvar_theme_office( $key ) {
	return function_exists( 'dadvar_office' ) ? (string) dadvar_office( $key ) : '';
}

/**
 * Persian digits for display.
 *
 * @param string $value Value.
 * @return string
 */
function dadvar_theme_fa( $value ) {
	return function_exists( 'dadvar_fa_digits' ) ? dadvar_fa_digits( $value ) : str_replace( range( 0, 9 ), array( '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' ), (string) $value );
}

/**
 * Localized date (Jalali when the companion plugin is active).
 *
 * @param int|WP_Post|null $post Post.
 * @param string           $which published|modified.
 * @return string
 */
function dadvar_theme_date( $post = null, $which = 'published' ) {
	$timestamp = 'modified' === $which ? get_post_modified_time( 'U', true, $post ) : get_post_time( 'U', true, $post );
	if ( function_exists( 'dadvar_jalali_date' ) ) {
		return dadvar_jalali_date( $timestamp );
	}
	return dadvar_theme_fa( wp_date( get_option( 'date_format' ), $timestamp ) );
}

/**
 * Whether the current (or given) post is built with Elementor.
 *
 * @param int|null $post_id Post ID.
 * @return bool
 */
function dadvar_theme_is_elementor_page( $post_id = null ) {
	if ( ! did_action( 'elementor/loaded' ) || ! class_exists( '\Elementor\Plugin' ) ) {
		return false;
	}
	$post_id  = $post_id ? $post_id : get_the_ID();
	$document = $post_id ? \Elementor\Plugin::$instance->documents->get( $post_id ) : null;
	return $document && $document->is_built_with_elementor();
}

/**
 * URL of the primary call-to-action (consultation page).
 *
 * @return string
 */
function dadvar_theme_cta_url() {
	$page_id = (int) get_theme_mod( 'dadvar_cta_page', 0 );
	if ( ! $page_id ) {
		$page_id = (int) dadvar_theme_office( 'contact_page' );
	}
	return $page_id ? (string) get_permalink( $page_id ) : '';
}

/**
 * Article meta: real author, published and updated dates, categories.
 */
function dadvar_theme_post_meta() {
	$published = get_post_time( 'U', true );
	$modified  = get_post_modified_time( 'U', true );
	echo '<div class="entry-meta">';
	printf(
		'<span class="entry-meta__item">نویسنده: <a href="%1$s" rel="author">%2$s</a></span>',
		esc_url( get_author_posts_url( (int) get_the_author_meta( 'ID' ) ) ),
		esc_html( get_the_author() )
	);
	printf(
		'<span class="entry-meta__item">انتشار: <time datetime="%1$s">%2$s</time></span>',
		esc_attr( get_the_date( 'c' ) ),
		esc_html( dadvar_theme_date( null, 'published' ) )
	);
	if ( $modified - $published > DAY_IN_SECONDS ) {
		printf(
			'<span class="entry-meta__item">به‌روزرسانی: <time datetime="%1$s">%2$s</time></span>',
			esc_attr( get_the_modified_date( 'c' ) ),
			esc_html( dadvar_theme_date( null, 'modified' ) )
		);
	}
	$categories = get_the_category_list( '، ' );
	if ( $categories ) {
		echo '<span class="entry-meta__item">دسته: ' . wp_kses_post( $categories ) . '</span>';
	}
	echo '</div>';
}

/**
 * Breadcrumb trail (visual + accessible). Structured breadcrumb data is left to the SEO plugin.
 */
function dadvar_theme_breadcrumbs() {
	if ( is_front_page() ) {
		return;
	}
	$items = array( array( 'خانه', home_url( '/' ) ) );
	if ( is_singular( 'dadvar_service' ) ) {
		$items[] = array( 'خدمات', get_post_type_archive_link( 'dadvar_service' ) );
	} elseif ( is_singular( 'post' ) ) {
		$posts_page = (int) get_option( 'page_for_posts' );
		if ( $posts_page ) {
			$items[] = array( get_the_title( $posts_page ), get_permalink( $posts_page ) );
		}
		$categories = get_the_category();
		if ( $categories ) {
			$items[] = array( $categories[0]->name, get_category_link( $categories[0] ) );
		}
	}

	if ( is_singular() ) {
		$items[] = array( single_post_title( '', false ), '' );
	} elseif ( is_post_type_archive() ) {
		$items[] = array( post_type_archive_title( '', false ), '' );
	} elseif ( is_category() || is_tag() || is_tax() ) {
		$items[] = array( single_term_title( '', false ), '' );
	} elseif ( is_home() ) {
		$items[] = array( single_post_title( '', false ), '' );
	} elseif ( is_search() ) {
		$items[] = array( 'نتایج جست‌وجو', '' );
	} elseif ( is_404() ) {
		$items[] = array( 'صفحه پیدا نشد', '' );
	} elseif ( is_author() ) {
		$items[] = array( get_the_author(), '' );
	}

	echo '<nav class="breadcrumbs" aria-label="مسیر صفحه"><ol>';
	$last = count( $items ) - 1;
	foreach ( $items as $index => $item ) {
		if ( $index === $last || '' === $item[1] ) {
			echo '<li><span aria-current="page">' . esc_html( $item[0] ) . '</span></li>';
		} else {
			echo '<li><a href="' . esc_url( $item[1] ) . '">' . esc_html( $item[0] ) . '</a></li>';
		}
	}
	echo '</ol></nav>';
}

/**
 * Numbered pagination with Persian labels.
 */
function dadvar_theme_pagination() {
	the_posts_pagination(
		array(
			'mid_size'           => 1,
			'prev_text'          => 'صفحهٔ قبل',
			'next_text'          => 'صفحهٔ بعد',
			'before_page_number' => '<span class="screen-reader-text">صفحهٔ </span>',
			'aria_label'         => 'صفحه‌بندی',
			'class'              => 'pagination',
		)
	);
}

/**
 * Persian digits in pagination numbers.
 *
 * @param string $markup Pagination HTML.
 * @return string
 */
function dadvar_theme_pagination_digits( $markup ) {
	return preg_replace_callback(
		'/>(\d+)</',
		function ( $found ) {
			return '>' . dadvar_theme_fa( $found[1] ) . '<';
		},
		$markup
	);
}
add_filter( 'navigation_markup_template', 'dadvar_theme_pagination_markup' );
add_filter( 'paginate_links_output', 'dadvar_theme_pagination_digits' );

/**
 * Pagination wrapper markup (no screen-reader heading duplication).
 *
 * @return string
 */
function dadvar_theme_pagination_markup() {
	return '<nav class="navigation %1$s" aria-label="%4$s"><div class="nav-links">%3$s</div></nav>';
}

/**
 * Related articles from the same category.
 *
 * @param int $post_id Post ID.
 * @return WP_Post[]
 */
function dadvar_theme_related_posts( $post_id ) {
	$categories = wp_get_post_categories( $post_id );
	if ( ! $categories ) {
		return array();
	}
	return get_posts(
		array(
			'post_type'           => 'post',
			'posts_per_page'      => 3,
			'post__not_in'        => array( $post_id ),
			'category__in'        => $categories,
			'ignore_sticky_posts' => true,
			'no_found_rows'       => true,
		)
	);
}

/**
 * Phone link markup (falls back gracefully without the plugin).
 *
 * @param string $phone Phone.
 * @return string
 */
function dadvar_theme_phone_link( $phone ) {
	if ( class_exists( 'Dadvar_Core_Components' ) ) {
		return Dadvar_Core_Components::phone_link( $phone );
	}
	return esc_html( $phone );
}

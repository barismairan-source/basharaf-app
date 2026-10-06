<?php
/**
 * Empty state for archives and search.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;
?>
<div class="empty-state">
	<?php if ( is_search() ) : ?>
		<p>برای «<?php echo esc_html( get_search_query() ); ?>» نتیجه‌ای پیدا نشد. واژهٔ کوتاه‌تر یا هم‌معنا را امتحان کنید.</p>
	<?php else : ?>
		<p>هنوز مطلبی در این بخش منتشر نشده است.</p>
	<?php endif; ?>
	<?php get_search_form(); ?>
	<p class="empty-state__links">
		<a href="<?php echo esc_url( home_url( '/' ) ); ?>">صفحهٔ اصلی</a>
		<?php if ( post_type_exists( 'dadvar_service' ) ) : ?>
			· <a href="<?php echo esc_url( get_post_type_archive_link( 'dadvar_service' ) ); ?>">خدمات</a>
		<?php endif; ?>
		<?php if ( dadvar_theme_cta_url() ) : ?>
			· <a href="<?php echo esc_url( dadvar_theme_cta_url() ); ?>">تماس با دفتر</a>
		<?php endif; ?>
	</p>
</div>

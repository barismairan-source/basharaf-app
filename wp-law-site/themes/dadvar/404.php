<?php
/**
 * Not found.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="site-main" tabindex="-1">
	<?php get_template_part( 'template-parts/content/page-header', null, array( 'title' => 'صفحه‌ای که دنبالش هستید پیدا نشد' ) ); ?>
	<div class="container section">
		<div class="empty-state">
			<p>ممکن است نشانی اشتباه وارد شده یا این صفحه جابه‌جا شده باشد. از جست‌وجو یا پیوندهای زیر استفاده کنید.</p>
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
	</div>
</main>
<?php
get_footer();

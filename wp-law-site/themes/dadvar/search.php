<?php
/**
 * Search results and empty state.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

get_header();
global $wp_query;
$dadvar_count = (int) $wp_query->found_posts;
?>
<main id="content" class="site-main" tabindex="-1">
	<?php
	get_template_part(
		'template-parts/content/page-header',
		null,
		array(
			/* translators: %s: search terms. */
			'title' => sprintf( 'جست‌وجو برای «%s»', get_search_query() ),
		)
	);
	?>
	<div class="container section">
		<div class="search-again"><?php get_search_form(); ?></div>
		<?php if ( have_posts() ) : ?>
			<p class="search-count" role="status"><?php echo esc_html( dadvar_theme_fa( $dadvar_count ) . ' نتیجه پیدا شد.' ); ?></p>
			<ul class="dv-cards" role="list">
				<?php
				while ( have_posts() ) :
					the_post();
					get_template_part( 'template-parts/content/card' );
				endwhile;
				?>
			</ul>
			<?php dadvar_theme_pagination(); ?>
		<?php else : ?>
			<?php get_template_part( 'template-parts/content/none' ); ?>
		<?php endif; ?>
	</div>
</main>
<?php
get_footer();

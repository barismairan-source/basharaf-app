<?php
/**
 * Fallback template and articles index (posts page).
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="site-main" tabindex="-1">
	<?php
	get_template_part(
		'template-parts/content/page-header',
		null,
		array(
			'title'       => is_home() && get_option( 'page_for_posts' ) ? get_the_title( (int) get_option( 'page_for_posts' ) ) : 'مقالات',
			'description' => '',
		)
	);
	?>
	<div class="container section">
		<?php if ( have_posts() ) : ?>
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

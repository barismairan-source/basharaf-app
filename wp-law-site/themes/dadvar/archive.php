<?php
/**
 * Category, tag, author and date archives.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="site-main" tabindex="-1">
	<?php
	if ( ! dadvar_theme_do_location( 'archive' ) ) :
		get_template_part(
			'template-parts/content/page-header',
			null,
			array(
				'title'       => wp_strip_all_tags( get_the_archive_title() ),
				'description' => get_the_archive_description(),
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
	<?php endif; ?>
</main>
<?php
get_footer();

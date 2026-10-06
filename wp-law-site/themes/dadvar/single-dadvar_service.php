<?php
/**
 * Single service. Elementor-built services own their whole layout;
 * otherwise a structured fallback with the closing call to action is shown.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="site-main" tabindex="-1">
	<?php
	if ( ! dadvar_theme_do_location( 'single' ) ) :
		while ( have_posts() ) :
			the_post();
			if ( dadvar_theme_is_elementor_page() || false !== strpos( get_the_content(), 'dv-section' ) ) :
				echo '<div class="container">';
				dadvar_theme_breadcrumbs();
				echo '</div>';
				the_content();
			else :
				get_template_part(
					'template-parts/content/page-header',
					null,
					array(
						'title'       => get_the_title(),
						'description' => has_excerpt() ? get_the_excerpt() : '',
					)
				);
				?>
				<div class="container container--narrow section">
					<div class="entry-content"><?php the_content(); ?></div>
					<?php get_template_part( 'template-parts/content/cta' ); ?>
				</div>
				<?php
			endif;
		endwhile;
	endif;
	?>
</main>
<?php
get_footer();

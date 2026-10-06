<?php
/**
 * Pages. Elementor-built pages render full width without the theme title
 * (the page design owns its own heading); other pages use the reading layout.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="site-main" tabindex="-1">
	<?php
	while ( have_posts() ) :
		the_post();
		if ( dadvar_theme_is_elementor_page() ) :
			the_content();
		elseif ( false !== strpos( get_the_content(), 'dv-section' ) ) :
			// Layout created by the sample importer without Elementor: full width, own headings.
			echo '<div class="dv-fallback-layout">';
			the_content();
			echo '</div>';
		else :
			get_template_part( 'template-parts/content/page-header', null, array( 'title' => get_the_title() ) );
			?>
			<div class="container section">
				<div class="entry-content">
					<?php
					the_content();
					wp_link_pages();
					?>
				</div>
			</div>
			<?php
		endif;
	endwhile;
	?>
</main>
<?php
get_footer();

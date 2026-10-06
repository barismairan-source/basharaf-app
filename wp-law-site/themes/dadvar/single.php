<?php
/**
 * Single article.
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
			?>
			<article <?php post_class( 'article' ); ?>>
				<header class="page-header">
					<div class="container container--narrow">
						<?php dadvar_theme_breadcrumbs(); ?>
						<h1 class="page-header__title"><?php the_title(); ?></h1>
						<?php dadvar_theme_post_meta(); ?>
					</div>
				</header>
				<div class="container container--narrow section">
					<?php if ( has_post_thumbnail() ) : ?>
						<figure class="article__image">
							<?php
							the_post_thumbnail(
								'large',
								array(
									'loading'       => 'eager',
									'fetchpriority' => 'high',
									'sizes'         => '(min-width: 800px) 760px, 100vw',
								)
							);
							?>
						</figure>
					<?php endif; ?>
					<div class="entry-content">
						<?php
						the_content();
						wp_link_pages();
						?>
					</div>
					<?php
					$dadvar_note = (string) get_theme_mod( 'dadvar_article_note', 'این مطلب جنبهٔ آموزشی و اطلاع‌رسانی عمومی دارد و جایگزین مشاورهٔ حقوقی متناسب با شرایط شما نیست.' );
					if ( $dadvar_note ) :
						?>
						<p class="article__note"><?php echo esc_html( $dadvar_note ); ?></p>
					<?php endif; ?>
					<?php if ( get_the_author_meta( 'description' ) ) : ?>
						<section class="author-box" aria-label="دربارهٔ نویسنده">
							<p class="author-box__name"><?php the_author(); ?></p>
							<p><?php echo esc_html( get_the_author_meta( 'description' ) ); ?></p>
						</section>
					<?php endif; ?>
					<?php get_template_part( 'template-parts/content/cta' ); ?>
				</div>
			</article>
			<?php
			$dadvar_related = dadvar_theme_related_posts( get_the_ID() );
			if ( $dadvar_related ) :
				?>
				<section class="related section section--surface" aria-labelledby="related-title">
					<div class="container">
						<h2 id="related-title">مطالب مرتبط</h2>
						<ul class="dv-cards" role="list">
							<?php
							foreach ( $dadvar_related as $post ) : // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- restored by wp_reset_postdata().
								setup_postdata( $post );
								get_template_part( 'template-parts/content/card' );
							endforeach;
							wp_reset_postdata();
							?>
						</ul>
					</div>
				</section>
				<?php
			endif;
			if ( comments_open() || get_comments_number() ) {
				echo '<div class="container container--narrow section">';
				comments_template();
				echo '</div>';
			}
		endwhile;
	endif;
	?>
</main>
<?php
get_footer();

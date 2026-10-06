<?php
/**
 * Services index.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

get_header();
$dadvar_object = get_post_type_object( 'dadvar_service' );
?>
<main id="content" class="site-main" tabindex="-1">
	<?php
	if ( ! dadvar_theme_do_location( 'archive' ) ) :
		get_template_part(
			'template-parts/content/page-header',
			null,
			array(
				'title'       => post_type_archive_title( '', false ),
				'description' => $dadvar_object ? $dadvar_object->description : '',
			)
		);
		?>
		<div class="container section">
			<?php if ( have_posts() ) : ?>
				<ul class="dv-cards" role="list">
					<?php
					while ( have_posts() ) :
						the_post();
						?>
						<li <?php post_class( 'dv-card' ); ?>>
							<h2 class="dv-card__title"><a class="dv-card__link" href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
							<?php if ( has_excerpt() ) : ?>
								<p class="dv-card__text"><?php echo esc_html( get_the_excerpt() ); ?></p>
							<?php endif; ?>
							<span class="dv-card__more" aria-hidden="true">جزئیات این خدمت</span>
						</li>
						<?php
					endwhile;
					?>
				</ul>
				<?php dadvar_theme_pagination(); ?>
			<?php else : ?>
				<?php get_template_part( 'template-parts/content/none' ); ?>
			<?php endif; ?>
			<?php get_template_part( 'template-parts/content/cta' ); ?>
		</div>
	<?php endif; ?>
</main>
<?php
get_footer();

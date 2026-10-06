<?php
/**
 * Post card used in archives and search results.
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;
?>
<li <?php post_class( 'dv-card' ); ?>>
	<?php if ( has_post_thumbnail() ) : ?>
		<div class="dv-card__media">
			<?php
			the_post_thumbnail(
				'dadvar-card',
				array(
					'loading' => 'lazy',
					'alt'     => '',
					'sizes'   => '(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw',
				)
			);
			?>
		</div>
	<?php endif; ?>
	<h2 class="dv-card__title"><a class="dv-card__link" href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
	<?php if ( 'post' === get_post_type() ) : ?>
		<p class="dv-card__meta"><time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( dadvar_theme_date() ); ?></time></p>
	<?php elseif ( is_search() ) : ?>
		<p class="dv-card__meta"><?php echo esc_html( 'dadvar_service' === get_post_type() ? 'خدمت' : 'برگه' ); ?></p>
	<?php endif; ?>
	<p class="dv-card__text"><?php echo esc_html( wp_strip_all_tags( get_the_excerpt() ) ); ?></p>
</li>

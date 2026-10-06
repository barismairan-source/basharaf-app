<?php
/**
 * Theme header (used when no Elementor Pro header template is assigned).
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

$dadvar_phone     = dadvar_theme_office( 'phone' ) ? dadvar_theme_office( 'phone' ) : dadvar_theme_office( 'mobile' );
$dadvar_tel       = function_exists( 'dadvar_tel_href' ) ? dadvar_tel_href( $dadvar_phone ) : '';
$dadvar_cta_url   = dadvar_theme_cta_url();
$dadvar_cta_label = (string) get_theme_mod( 'dadvar_cta_label', 'درخواست مشاوره' );
?>
<header class="site-header">
	<div class="container site-header__inner">
		<div class="site-brand">
			<?php if ( has_custom_logo() ) : ?>
				<?php the_custom_logo(); ?>
			<?php else : ?>
				<a class="site-brand__name" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a>
			<?php endif; ?>
		</div>

		<div class="site-header__tools">
			<?php if ( $dadvar_tel && get_theme_mod( 'dadvar_header_phone', true ) ) : ?>
				<a class="header-call" href="<?php echo esc_url( $dadvar_tel, array( 'tel' ) ); ?>">
					<svg class="dv-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>
					<span class="header-call__text"><span class="screen-reader-text">تماس تلفنی: </span><bdi dir="ltr"><?php echo esc_html( dadvar_theme_fa( function_exists( 'dadvar_latin_digits' ) ? dadvar_latin_digits( $dadvar_phone ) : $dadvar_phone ) ); ?></bdi></span>
				</a>
			<?php endif; ?>
			<?php if ( has_nav_menu( 'primary' ) || $dadvar_cta_url ) : ?>
				<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
					<span class="nav-toggle__bars" aria-hidden="true"></span>
					<span class="nav-toggle__label">منو</span>
				</button>
			<?php endif; ?>
		</div>

		<nav id="site-nav" class="site-nav" aria-label="منوی اصلی">
			<?php
			if ( has_nav_menu( 'primary' ) ) {
				wp_nav_menu(
					array(
						'theme_location' => 'primary',
						'container'      => false,
						'menu_class'     => 'site-nav__list',
						'depth'          => 2,
						'fallback_cb'    => false,
					)
				);
			}
			?>
			<?php if ( $dadvar_cta_url ) : ?>
				<a class="dv-button dv-button--solid site-nav__cta" href="<?php echo esc_url( $dadvar_cta_url ); ?>"><?php echo esc_html( $dadvar_cta_label ); ?></a>
			<?php endif; ?>
		</nav>
	</div>
</header>

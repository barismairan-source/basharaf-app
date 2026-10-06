<?php
/**
 * Theme footer (used when no Elementor Pro footer template is assigned).
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

$dadvar_about = (string) get_theme_mod( 'dadvar_footer_about', '' );
$dadvar_about = '' !== $dadvar_about ? $dadvar_about : get_bloginfo( 'description' );
?>
<footer class="site-footer">
	<div class="container site-footer__grid">
		<section class="site-footer__col" aria-labelledby="footer-about-title">
			<h2 class="site-footer__title" id="footer-about-title"><?php bloginfo( 'name' ); ?></h2>
			<?php if ( $dadvar_about ) : ?>
				<p><?php echo esc_html( $dadvar_about ); ?></p>
			<?php endif; ?>
			<?php
			if ( class_exists( 'Dadvar_Core_Components' ) && dadvar_theme_office( 'lawyer_name' ) ) {
				echo Dadvar_Core_Components::lawyer( array( 'show_license' => true ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- component escapes.
			}
			?>
		</section>

		<?php if ( class_exists( 'Dadvar_Core_Components' ) ) : ?>
			<section class="site-footer__col" aria-labelledby="footer-contact-title">
				<h2 class="site-footer__title" id="footer-contact-title">اطلاعات تماس</h2>
				<?php echo Dadvar_Core_Components::office_info( array( 'fields' => array( 'phone', 'mobile', 'email', 'address', 'hours', 'map' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- component escapes. ?>
			</section>
		<?php endif; ?>

		<?php if ( has_nav_menu( 'footer' ) ) : ?>
			<nav class="site-footer__col" aria-labelledby="footer-nav-title">
				<h2 class="site-footer__title" id="footer-nav-title">پیوندها</h2>
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'footer',
						'container'      => false,
						'menu_class'     => 'site-footer__menu',
						'depth'          => 1,
						'fallback_cb'    => false,
					)
				);
				?>
			</nav>
		<?php endif; ?>

		<?php if ( is_active_sidebar( 'footer-extra' ) ) : ?>
			<div class="site-footer__col">
				<?php dynamic_sidebar( 'footer-extra' ); ?>
			</div>
		<?php endif; ?>
	</div>
	<div class="site-footer__bottom">
		<div class="container">
			<p><?php echo esc_html( dadvar_theme_copyright() ); ?></p>
		</div>
	</div>
</footer>

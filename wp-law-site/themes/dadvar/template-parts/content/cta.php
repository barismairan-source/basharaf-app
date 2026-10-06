<?php
/**
 * Closing call to action (services and articles).
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

$dadvar_cta_url = dadvar_theme_cta_url();
if ( ! $dadvar_cta_url && ! class_exists( 'Dadvar_Core_Components' ) ) {
	return;
}
?>
<aside class="cta-box" aria-labelledby="cta-box-title">
	<h2 class="cta-box__title" id="cta-box-title"><?php echo esc_html( (string) get_theme_mod( 'dadvar_cta_heading', 'برای بررسی موضوع خود با دفتر تماس بگیرید' ) ); ?></h2>
	<div class="cta-box__actions">
		<?php if ( $dadvar_cta_url ) : ?>
			<a class="dv-button dv-button--solid" href="<?php echo esc_url( $dadvar_cta_url ); ?>"><?php echo esc_html( (string) get_theme_mod( 'dadvar_cta_label', 'درخواست مشاوره' ) ); ?></a>
		<?php endif; ?>
		<?php
		if ( class_exists( 'Dadvar_Core_Components' ) ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- component escapes its output.
			echo Dadvar_Core_Components::call_button(
				array(
					'label' => 'تماس تلفنی',
					'style' => 'light',
				)
			);
		}
		?>
	</div>
</aside>
